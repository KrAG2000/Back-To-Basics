import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'express-async-errors';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import pino from 'pino';
import { z } from 'zod';
import client from 'prom-client';
import { config } from '../config.js';
import { DomainError } from '../lib.js';
import { createPayment, capturePayment, getPayment, inquirePayment, listPayments, reversePayment, retryPayment } from '../payments/service.js';
import { createRefund } from '../refunds/service.js';
import { runSettlement, listSettlements, reconcile, listReconciliations } from '../settlement/service.js';
import { openDispute, resolveDispute } from '../disputes/service.js';
import { createMandate, runMandate, cancelMandate, listMandates } from '../mandates/service.js';
import { actorsAndAccounts, auditLogs, createAccount, createActor, flushOutbox, overview, processWebhooks, scenarios, systemState, updateConfig } from '../operations/service.js';
import { one } from '../database/db.js';

const logger = pino({ level: config.logLevel, redact: ['req.headers.authorization','req.headers.x-api-key','*.synthetic_identifier'] });
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix:'payment_lab_' });
const businessGauges={
  transactions:new client.Gauge({name:'payment_lab_transactions_total',help:'Number of simulated payments',registers:[register]}),
  tpv:new client.Gauge({name:'payment_lab_tpv_minor_units',help:'Total simulated payment volume in minor units',registers:[register]}),
  successRate:new client.Gauge({name:'payment_lab_success_rate_percent',help:'Successful simulated payments as a percentage',registers:[register]}),
  unknown:new client.Gauge({name:'payment_lab_unknown_outcomes',help:'Payments with an unknown outcome',registers:[register]}),
  p95:new client.Gauge({name:'payment_lab_provider_latency_p95_ms',help:'Synthetic provider latency p95 in milliseconds',registers:[register]}),
  mismatches:new client.Gauge({name:'payment_lab_reconciliation_mismatches',help:'Reconciliation mismatches detected',registers:[register]})
};

const paymentSchema = z.object({
  merchantId:z.string().min(1), customerId:z.string().min(1), sourceAccountId:z.string().min(1),
  amount:z.number().int().positive().max(100000000), currency:z.string().length(3).default('INR'),
  method:z.enum(['CARD','UPI','BANK','WALLET','NET_BANKING','MANDATE']), captureMethod:z.enum(['AUTOMATIC','MANUAL']).default('AUTOMATIC'),
  scenario:z.object({provider:z.string().optional(),providerBehavior:z.string().optional(),risk:z.string().optional(),deviceRisk:z.string().optional(),latencyMs:z.number().int().nonnegative().optional(),inquiryOutcome:z.string().optional(),webhookBehavior:z.array(z.number().int()).optional(),webhookUrl:z.string().url().optional(),reconciliationMismatch:z.boolean().optional()}).default({})
});
const actorSchema=z.object({type:z.enum(['CUSTOMER','MERCHANT']),name:z.string().min(2),email:z.string().email().optional(),riskLevel:z.enum(['LOW','MEDIUM','HIGH']).optional(),metadata:z.record(z.any()).optional()});
const accountSchema=z.object({actorId:z.string(),accountType:z.enum(['BANK','CARD','UPI','WALLET','MERCHANT']),currency:z.string().length(3).optional(),balance:z.number().int().nonnegative().optional(),syntheticIdentifier:z.string().min(3).optional()});

function validate(schema) { return (req,res,next) => { const parsed=schema.safeParse(req.body); if (!parsed.success) return next(new DomainError('Request validation failed','VALIDATION_ERROR',400,parsed.error.flatten())); req.body=parsed.data; next(); }; }

export function createApp() {
  const app=express();
  app.disable('x-powered-by');
  app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],connectSrc:["'self'"]}}}));
  app.use(cors()); app.use(express.json({limit:'256kb'})); app.use(pinoHttp({logger,genReqId:(req)=>req.headers['x-request-id']||`req_${crypto.randomUUID()}`}));
  const requests=new Map();
  app.use('/api',(req,res,next)=>{
    if (req.path==='/health') return next();
    if (req.headers['x-api-key']!==config.apiKey) return next(new DomainError('A valid X-API-Key is required','UNAUTHORIZED',401));
    const key=req.ip; const current=requests.get(key)||{count:0,reset:Date.now()+60000};
    if (Date.now()>current.reset) { current.count=0; current.reset=Date.now()+60000; }
    current.count+=1; requests.set(key,current); res.setHeader('X-RateLimit-Remaining',String(Math.max(0,120-current.count)));
    if (current.count>120) return next(new DomainError('Rate limit exceeded','RATE_LIMITED',429)); next();
  });

  app.get('/api/health',async(_req,res)=>{ const db=await one('SELECT now() time'); res.json({status:'ok',database:true,time:db.time,educationalSimulation:true}); });
  app.get('/api/bootstrap',async(_req,res)=>res.json({...await actorsAndAccounts(),scenarios,apiKeyHint:'lab_test_key'}));
  app.post('/api/actors',validate(actorSchema),async(req,res)=>res.status(201).json(await createActor(req.body)));
  app.post('/api/accounts',validate(accountSchema),async(req,res)=>res.status(201).json(await createAccount(req.body)));
  app.get('/api/payments',async(req,res)=>res.json(await listPayments(req.query)));
  app.post('/api/payments',validate(paymentSchema),async(req,res)=>res.status(201).json(await createPayment(req.body,req.headers['idempotency-key'])));
  app.get('/api/payments/:id',async(req,res)=>res.json(await getPayment(req.params.id)));
  app.post('/api/payments/:id/capture',async(req,res)=>res.json(await capturePayment(req.params.id,req.body.amount,req.headers['idempotency-key'])));
  app.post('/api/payments/:id/inquire',async(req,res)=>res.json(await inquirePayment(req.params.id)));
  app.post('/api/payments/:id/reverse',async(req,res)=>res.json(await reversePayment(req.params.id,req.headers['idempotency-key'])));
  app.post('/api/payments/:id/retry',async(req,res)=>res.json(await retryPayment(req.params.id,req.body.behavior||'SUCCESS')));
  app.post('/api/payments/:id/refunds',async(req,res)=>res.status(201).json(await createRefund(req.params.id,req.body,req.headers['idempotency-key'])));
  app.post('/api/payments/:id/disputes',async(req,res)=>res.status(201).json(await openDispute(req.params.id,req.body)));
  app.post('/api/disputes/:id/resolve',async(req,res)=>res.json(await resolveDispute(req.params.id,req.body.outcome)));
  app.post('/api/settlements',async(req,res)=>res.status(201).json(await runSettlement(req.body.merchantId)));
  app.get('/api/settlements',async(_req,res)=>res.json(await listSettlements()));
  app.post('/api/reconciliation',async(_req,res)=>res.status(201).json(await reconcile()));
  app.get('/api/reconciliation',async(_req,res)=>res.json(await listReconciliations()));
  app.post('/api/mandates',async(req,res)=>res.status(201).json(await createMandate(req.body)));
  app.get('/api/mandates',async(_req,res)=>res.json(await listMandates()));
  app.post('/api/mandates/:id/run',async(req,res)=>res.json(await runMandate(req.params.id,req.body.scenario)));
  app.post('/api/mandates/:id/cancel',async(req,res)=>res.json(await cancelMandate(req.params.id)));
  app.get('/api/overview',async(_req,res)=>res.json(await overview()));
  app.get('/api/operations',async(_req,res)=>res.json(await systemState()));
  app.post('/api/operations/webhooks/process',async(_req,res)=>res.json(await processWebhooks()));
  app.post('/api/operations/outbox/publish',async(_req,res)=>res.json({published:await flushOutbox()}));
  app.put('/api/operations/config/:key',async(req,res)=>res.json(await updateConfig(req.params.key,req.body.value)));
  app.get('/api/logs',async(req,res)=>res.json(await auditLogs(req.query.q)));
  app.get('/api/concepts',(_req,res)=>res.json(concepts));
  app.get('/metrics',async(_req,res)=>{const data=await overview();businessGauges.transactions.set(data.totalTransactions);businessGauges.tpv.set(data.tpv);businessGauges.successRate.set(data.successRate);businessGauges.unknown.set(data.unknown);businessGauges.p95.set(data.latency.p95);businessGauges.mismatches.set(data.reconciliationMismatches);res.setHeader('Content-Type',register.contentType);res.send(await register.metrics());});

  const frontend=fileURLToPath(new URL('../../../frontend',import.meta.url));
  app.use(express.static(frontend));
  app.get('*',(_req,res)=>res.sendFile(path.join(frontend,'index.html')));
  app.use((error,req,res,_next)=>{
    const status=error.status||500; req.log?.[status>=500?'error':'warn']({err:error,code:error.code},error.message);
    res.status(status).json({error:{code:error.code||'INTERNAL_ERROR',message:status===500?'Unexpected simulator error':error.message,details:error.details,requestId:req.id}});
  });
  return app;
}

const concepts={
  authorization:'The issuer approves an amount and places a temporary hold. No merchant settlement has happened yet.',
  capture:'Capture converts an authorization hold into a financial journal: customer funds are debited and merchant payable is credited.',
  clearing:'Clearing agrees the transaction records and obligations between participants. This lab represents it through pending settlement records.',
  settlement:'Settlement batches captured payments, subtracts refunds, fees and taxes, then credits the synthetic merchant bank account.',
  ledger:'Every journal has equal debits and credits. Payment status is intentionally separate from ledger state.',
  idempotency:'The API stores a request hash by operation and key. Identical retries replay one result; different payloads conflict.',
  outbox:'Domain events and outbox rows commit in the same PostgreSQL transaction. A publisher later moves events to Redis queues.',
  unknown:'UNKNOWN means the provider may have processed the payment but its response was lost. Inquiry or reconciliation resolves it safely.',
  reconciliation:'Independent payment, provider, refund, settlement, and ledger records are compared to find mismatches.',
  webhook:'Signed merchant notifications retry independently; failed notification never changes payment truth.'
};

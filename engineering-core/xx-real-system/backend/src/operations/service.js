import { id } from '../lib.js';
import { pool, rows, one, tx } from '../database/db.js';
import { queueDepths, publishOutbox } from '../events/outbox.js';

export const scenarios = [
  { id:'upi_success',name:'Successful UPI-style payment',category:'NORMAL',method:'UPI',scenario:{providerBehavior:'SUCCESS'},expected:'SUCCESS',lesson:'Authorization creates a hold; capture posts the ledger; settlement remains pending.' },
  { id:'card_success',name:'Successful card payment',category:'NORMAL',method:'CARD',scenario:{providerBehavior:'SUCCESS'},expected:'SUCCESS',lesson:'Gateway routing, issuer authorization, capture, outbox, and webhook are independent stages.' },
  { id:'lost_response',name:'Lost response / unknown outcome',category:'DISTRIBUTED_SYSTEM',method:'UPI',scenario:{providerBehavior:'LOST_RESPONSE'},expected:'UNKNOWN → SUCCESS after inquiry',lesson:'A lost response is not a decline. Status inquiry safely resolves provider truth.' },
  { id:'network_unknown',name:'Network timeout remains unknown',category:'INFRASTRUCTURE',method:'UPI',scenario:{providerBehavior:'NETWORK_TIMEOUT'},expected:'UNKNOWN',lesson:'When neither side can prove the outcome, reconciliation—not guessing—is required.' },
  { id:'insufficient_funds',name:'Insufficient funds',category:'CUSTOMER_FAILURE',method:'CARD',scenario:{providerBehavior:'INSUFFICIENT_FUNDS'},expected:'DECLINED',lesson:'Issuer declines are non-retryable.' },
  { id:'provider_503',name:'Provider unavailable',category:'INFRASTRUCTURE',method:'CARD',scenario:{providerBehavior:'PROVIDER_503'},expected:'FAILED / retryable attempt',lesson:'Temporary infrastructure errors are eligible for bounded backoff.' },
  { id:'risk_block',name:'Deterministic risk block',category:'RISK',method:'CARD',scenario:{risk:'BLOCK'},expected:'DECLINED before routing',lesson:'Risk rejection occurs before financial authorization.' },
  { id:'manual_capture',name:'Manual capture',category:'NORMAL',method:'CARD',captureMethod:'MANUAL',scenario:{providerBehavior:'SUCCESS'},expected:'AUTHORIZED',lesson:'Authorization only reserves funds; a later capture moves them into merchant payable.' },
  { id:'webhook_retry',name:'Webhook 500 → 500 → 200',category:'INTEGRATION',method:'UPI',scenario:{providerBehavior:'SUCCESS',webhookBehavior:[500,500,200]},expected:'SUCCESS, webhook retries',lesson:'Merchant notification failure does not roll back a successful payment.' },
  { id:'reconciliation_mismatch',name:'Provider status mismatch',category:'FINANCIAL',method:'UPI',scenario:{providerBehavior:'SUCCESS',reconciliationMismatch:true},expected:'Reconciliation mismatch',lesson:'Independent record comparison detects discrepancies after processing.' }
];

export async function createActor(input) {
  const actorId = id(input.type === 'MERCHANT' ? 'mer' : 'cus');
  const result = await pool.query(`INSERT INTO actors(id,type,name,email,risk_level,metadata) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`, [actorId,input.type,input.name,input.email||null,input.riskLevel||'LOW',input.metadata||{}]);
  return result.rows[0];
}

export async function createAccount(input) {
  const accountId = id('acc');
  const identifier = input.syntheticIdentifier || (input.accountType === 'UPI' ? `${accountId.slice(-8)}@sim` : `SIM-${accountId.slice(-12).toUpperCase()}`);
  const result = await pool.query(`INSERT INTO financial_accounts(id,actor_id,account_type,currency,balance,synthetic_identifier) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`, [accountId,input.actorId,input.accountType,input.currency||'INR',input.balance||0,identifier]);
  return { ...result.rows[0], balance:Number(result.rows[0].balance), held_amount:Number(result.rows[0].held_amount) };
}

export async function overview() {
  const stats = await one(`SELECT count(*)::int total,
    count(*) FILTER(WHERE status IN ('SUCCESS','SETTLED','PARTIALLY_REFUNDED','REFUNDED'))::int successful,
    count(*) FILTER(WHERE status='FAILED')::int failed,
    count(*) FILTER(WHERE status='DECLINED')::int declined,
    count(*) FILTER(WHERE status IN ('PENDING','PROCESSING','AUTHORIZED'))::int pending,
    count(*) FILTER(WHERE status='UNKNOWN')::int unknown,
    COALESCE(sum(amount),0)::bigint tpv,
    COALESCE(sum(refunded_amount),0)::bigint refunds,
    COALESCE(avg(EXTRACT(EPOCH FROM(updated_at-created_at))*1000),0)::numeric latency
    FROM payments`);
  const provider = await rows(`SELECT provider,count(*)::int attempts,
    count(*) FILTER(WHERE status='AUTHORIZED')::int approved,
    round(avg(latency_ms),1) latency_ms FROM payment_attempts GROUP BY provider ORDER BY provider`);
  const financial = await one(`SELECT COALESCE(sum(net),0)::bigint settled FROM settlements WHERE status='COMPLETED'`);
  const percentiles = await one(`SELECT COALESCE(percentile_cont(0.5) WITHIN GROUP(ORDER BY latency_ms),0)::numeric p50,
    COALESCE(percentile_cont(0.95) WITHIN GROUP(ORDER BY latency_ms),0)::numeric p95,
    COALESCE(percentile_cont(0.99) WITHIN GROUP(ORDER BY latency_ms),0)::numeric p99 FROM payment_attempts`);
  const mismatches = await one(`SELECT COALESCE(sum(CASE WHEN jsonb_typeof(mismatches)='array' THEN jsonb_array_length(mismatches) ELSE 0 END),0)::int count FROM reconciliation_reports`);
  const webhooks = await one(`SELECT count(*)::int total,count(*) FILTER(WHERE status='DELIVERED')::int delivered FROM webhook_deliveries`);
  const queue = await queueDepths();
  const total = stats.total || 1;
  return {
    totalTransactions:stats.total,successRate:Number((stats.successful/total*100).toFixed(1)),failureRate:Number((stats.failed/total*100).toFixed(1)),declineRate:Number((stats.declined/total*100).toFixed(1)),
    pending:stats.pending,unknown:stats.unknown,tpv:Number(stats.tpv),refunds:Number(stats.refunds),settled:Number(financial.settled),averageLatencyMs:Number(stats.latency),
    latency:{average:Number(stats.latency),p50:Number(percentiles.p50),p95:Number(percentiles.p95),p99:Number(percentiles.p99)},
    webhookDeliveryRate:webhooks.total?Number((webhooks.delivered/webhooks.total*100).toFixed(1)):0,reconciliationMismatches:mismatches.count,providers:provider.map(p=>({...p,successRate:p.attempts?Number((p.approved/p.attempts*100).toFixed(1)):0})),queue
  };
}

export async function processWebhooks(limit=20) {
  return tx(async (client) => {
    const hooks = (await client.query(`SELECT w.*,p.scenario FROM webhook_deliveries w JOIN payments p ON p.id=w.payment_id WHERE w.status IN ('QUEUED','RETRYING') AND (w.next_attempt_at IS NULL OR w.next_attempt_at<=now()) ORDER BY w.created_at FOR UPDATE SKIP LOCKED LIMIT $1`, [limit])).rows;
    const processed=[];
    for (const hook of hooks) {
      const sequence = hook.scenario?.webhookBehavior || [200];
      const responseCode = Number(sequence[Math.min(hook.attempts,sequence.length-1)] || 200);
      const delivered=responseCode>=200&&responseCode<300;
      const attempts=hook.attempts+1;
      const dead=!delivered&&attempts>=5;
      const status=delivered?'DELIVERED':dead?'DEAD_LETTER':'RETRYING';
      const delay=Math.min(300,2**attempts);
      await client.query(`UPDATE webhook_deliveries SET status=$2,response_code=$3,attempts=$4,next_attempt_at=now()+($5||' seconds')::interval,updated_at=now() WHERE id=$1`, [hook.id,status,responseCode,attempts,String(delay)]);
      processed.push({id:hook.id,status,responseCode,attempts});
    }
    return {processed};
  });
}

export async function systemState() {
  const configRows=await rows(`SELECT * FROM system_config ORDER BY key`);
  return {config:Object.fromEntries(configRows.map(r=>[r.key,r.value])),outbox:await rows(`SELECT * FROM outbox ORDER BY created_at DESC LIMIT 100`),webhooks:await rows(`SELECT * FROM webhook_deliveries ORDER BY created_at DESC LIMIT 100`),queues:await queueDepths()};
}

export async function updateConfig(key,value) {
  await pool.query(`INSERT INTO system_config(key,value,updated_at) VALUES($1,$2,now()) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=now()`,[key,value]);
  await pool.query(`INSERT INTO audit_logs(action,actor,resource_id,details) VALUES('CONFIG_UPDATE','operator',$1,$2)`,[key,{value}]);
  return {key,value};
}

export const actorsAndAccounts = async () => ({actors:await rows(`SELECT * FROM actors ORDER BY created_at`),accounts:(await rows(`SELECT f.*,a.name actor_name FROM financial_accounts f LEFT JOIN actors a ON a.id=f.actor_id ORDER BY f.created_at`)).map(a=>({...a,balance:Number(a.balance),held_amount:Number(a.held_amount)}))});
export const auditLogs = (query='') => rows(`SELECT * FROM audit_logs WHERE action ILIKE $1 OR resource_id ILIKE $1 ORDER BY created_at DESC LIMIT 200`,[`%${query}%`]);
export const flushOutbox = () => publishOutbox(500);

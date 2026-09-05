import { DomainError, hash, id } from '../lib.js';
import { tx, one } from '../database/db.js';
import { recordEvent, publishOutbox } from '../events/outbox.js';
import { postJournal } from '../ledger/service.js';
import { evaluateRisk } from '../risk/engine.js';
import { chooseProvider } from '../routing/router.js';
import { simulateProvider } from '../providers/simulator.js';
import { retryDelay } from '../providers/simulator.js';
import { assertTransition } from './stateMachine.js';

const paymentView = `SELECT p.*, m.name merchant_name, c.name customer_name,
  a.synthetic_identifier source_identifier, a.balance source_balance, a.held_amount source_held
  FROM payments p JOIN actors m ON m.id=p.merchant_id JOIN actors c ON c.id=p.customer_id
  JOIN financial_accounts a ON a.id=p.source_account_id`;

async function transition(client, payment, to, eventType, payload = {}, causationId = null) {
  assertTransition(payment.status, to);
  payment.status = to;
  payment.version += 1;
  await client.query(`UPDATE payments SET status=$2,version=$3,updated_at=now() WHERE id=$1`, [payment.id, to, payment.version]);
  return recordEvent(client, {
    aggregateId: payment.id, type: eventType, correlationId: payment.correlation_id,
    causationId, version: payment.version, payload: { paymentId: payment.id, status: to, ...payload }
  });
}

async function createHold(client, payment, account) {
  const available = Number(account.balance) - Number(account.held_amount);
  if (available < payment.amount) throw new DomainError('Insufficient available balance', 'INSUFFICIENT_FUNDS', 409);
  await client.query(`UPDATE financial_accounts SET held_amount=held_amount+$2 WHERE id=$1`, [account.id, payment.amount]);
  await client.query(
    `INSERT INTO holds(id,payment_id,account_id,amount,status,expires_at) VALUES($1,$2,$3,$4,'ACTIVE',now()+interval '7 days')`,
    [id('hold'), payment.id, account.id, payment.amount]
  );
}

async function captureInTx(client, payment, amount) {
  const hold = (await client.query(`SELECT * FROM holds WHERE payment_id=$1 AND status='ACTIVE' FOR UPDATE`, [payment.id])).rows[0];
  if (!hold) throw new DomainError('No active authorization hold', 'NO_ACTIVE_HOLD', 409);
  const remaining = Number(hold.amount) - Number(payment.captured_amount);
  if (amount > remaining) throw new DomainError('Capture exceeds authorized remainder', 'CAPTURE_TOO_LARGE', 409);
  await client.query(`UPDATE financial_accounts SET balance=balance-$2,held_amount=held_amount-$3 WHERE id=$1`, [hold.account_id, amount, Number(hold.amount)]);
  await postJournal(client, {
    paymentId: payment.id, kind: 'CAPTURE', description: 'Move authorized customer funds into merchant payable',
    entries: [
      { accountCode: `CUSTOMER_FUNDS:${payment.customer_id}`, direction: 'DEBIT', amount },
      { accountCode: `MERCHANT_PAYABLE:${payment.merchant_id}`, direction: 'CREDIT', amount }
    ]
  });
  const newCaptured = Number(payment.captured_amount) + amount;
  const fullyCaptured = newCaptured === Number(payment.amount);
  await client.query(`UPDATE payments SET captured_amount=$2,ledger_state='PENDING_SETTLEMENT' WHERE id=$1`, [payment.id, newCaptured]);
  payment.captured_amount = newCaptured;
  payment.ledger_state = 'PENDING_SETTLEMENT';
  await client.query(`UPDATE holds SET status=$2 WHERE id=$1`, [hold.id,fullyCaptured?'CAPTURED':'PARTIALLY_CAPTURED']);
  return fullyCaptured;
}

async function createWebhook(client, payment, event) {
  const body = { event: event.type, paymentId: payment.id, status: payment.status, eventId: event.id };
  const { hmac } = await import('../lib.js');
  const { config } = await import('../config.js');
  await client.query(
    `INSERT INTO webhook_deliveries(id,payment_id,event_id,url,status,signature,next_attempt_at) VALUES($1,$2,$3,$4,'QUEUED',$5,now())`,
    [id('wh'), payment.id, event.id, payment.scenario?.webhookUrl || 'https://merchant.example.test/webhooks', hmac(config.webhookSecret, body)]
  );
}

export async function createPayment(input, idempotencyKey) {
  if (!idempotencyKey) throw new DomainError('Idempotency-Key header is required', 'IDEMPOTENCY_KEY_REQUIRED', 400);
  const requestHash = hash(input);
  const result = await tx(async (client) => {
    const inserted = await client.query(
      `INSERT INTO idempotency_keys(scope,idempotency_key,request_hash) VALUES('payment.create',$1,$2)
       ON CONFLICT DO NOTHING RETURNING idempotency_key`, [idempotencyKey, requestHash]
    );
    if (!inserted.rowCount) {
      const prior = (await client.query(`SELECT * FROM idempotency_keys WHERE scope='payment.create' AND idempotency_key=$1 FOR UPDATE`, [idempotencyKey])).rows[0];
      if (prior.request_hash !== requestHash) throw new DomainError('Idempotency key reused with a different request', 'IDEMPOTENCY_CONFLICT', 409);
      if (prior.response) return { ...prior.response, idempotentReplay: true };
      throw new DomainError('Matching request is still in progress', 'IDEMPOTENCY_IN_PROGRESS', 409);
    }

    const merchant = (await client.query(`SELECT * FROM actors WHERE id=$1 AND type='MERCHANT'`, [input.merchantId])).rows[0];
    const customer = (await client.query(`SELECT * FROM actors WHERE id=$1 AND type='CUSTOMER'`, [input.customerId])).rows[0];
    const account = (await client.query(`SELECT * FROM financial_accounts WHERE id=$1 AND actor_id=$2 FOR UPDATE`, [input.sourceAccountId, input.customerId])).rows[0];
    if (!merchant || !customer || !account) throw new DomainError('Merchant, customer, or source account not found', 'ACTOR_NOT_FOUND', 404);

    const payment = {
      id: id('pay'), merchant_id: merchant.id, customer_id: customer.id, source_account_id: account.id,
      amount: input.amount, currency: input.currency || 'INR', method: input.method,
      status: 'CREATED', ledger_state: 'NOT_STARTED', capture_method: input.captureMethod || 'AUTOMATIC',
      captured_amount: 0, refunded_amount: 0, correlation_id: id('corr'), version: 1,
      scenario: input.scenario || {}
    };
    await client.query(
      `INSERT INTO payments(id,merchant_id,customer_id,source_account_id,amount,currency,method,status,ledger_state,capture_method,scenario,correlation_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [payment.id,payment.merchant_id,payment.customer_id,payment.source_account_id,payment.amount,payment.currency,payment.method,payment.status,payment.ledger_state,payment.capture_method,payment.scenario,payment.correlation_id]
    );
    let event = await recordEvent(client, { aggregateId: payment.id, type: 'PaymentCreated', correlationId: payment.correlation_id, payload: { paymentId: payment.id, amount: payment.amount, method: payment.method } });
    event = await transition(client, payment, 'INITIATED', 'PaymentInitiated', {}, event.id);
    event = await transition(client, payment, 'VALIDATING', 'PaymentValidated', {}, event.id);

    const recent = Number((await client.query(`SELECT count(*) FROM payments WHERE customer_id=$1 AND created_at > now()-interval '1 hour'`, [customer.id])).rows[0].count);
    event = await transition(client, payment, 'RISK_CHECK', 'RiskCheckStarted', {}, event.id);
    const risk = evaluateRisk({ amount: payment.amount, method: payment.method, customer, recentPayments: recent - 1, scenario: payment.scenario });
    payment.risk = risk;
    await client.query(`UPDATE payments SET risk=$2 WHERE id=$1`, [payment.id, risk]);
    event = await recordEvent(client, { aggregateId: payment.id, type: 'RiskCheckCompleted', correlationId: payment.correlation_id, causationId: event.id, version: payment.version, payload: risk });
    if (risk.decision === 'BLOCKED') {
      event = await transition(client, payment, 'DECLINED', 'PaymentDeclined', { reason: 'RISK_BLOCK' }, event.id);
      await createWebhook(client, payment, event);
    } else {
      event = await transition(client, payment, 'ROUTING', 'PaymentRoutingStarted', {}, event.id);
      const providers = (await client.query(`SELECT value FROM system_config WHERE key='providers'`)).rows[0].value;
      const route = chooseProvider({ method: payment.method, amount: payment.amount, scenario: payment.scenario, providers });
      payment.provider = route.provider;
      payment.routing = route;
      payment.provider_reference = id(payment.method === 'UPI' ? 'upi_ref' : 'prv');
      await client.query(`UPDATE payments SET provider=$2,provider_reference=$3,routing=$4 WHERE id=$1`, [payment.id,payment.provider,payment.provider_reference,route]);
      event = await recordEvent(client, { aggregateId: payment.id, type: 'PaymentRouted', correlationId: payment.correlation_id, causationId: event.id, version: payment.version, payload: route });
      event = await transition(client, payment, 'PROCESSING', 'AuthorizationRequested', { provider: payment.provider }, event.id);
      const providerResult = simulateProvider({ behavior: payment.scenario.providerBehavior, amount: payment.amount, account });
      await client.query(
        `INSERT INTO payment_attempts(id,payment_id,provider,status,error_class,error_code,latency_ms,request,response)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id('att'),payment.id,payment.provider,providerResult.outcome,providerResult.errorClass,providerResult.code,payment.scenario.latencyMs || 80,{amount:payment.amount,method:payment.method},providerResult]
      );
      if (providerResult.outcome === 'AUTHORIZED') {
        await createHold(client, payment, account);
        event = await transition(client, payment, 'AUTHORIZED', 'AuthorizationSucceeded', { holdAmount: payment.amount }, event.id);
        if (payment.capture_method === 'AUTOMATIC') {
          await captureInTx(client, payment, payment.amount);
          event = await transition(client, payment, 'CAPTURED', 'CaptureSucceeded', { amount: payment.amount }, event.id);
          event = await transition(client, payment, 'SUCCESS', 'PaymentSucceeded', {}, event.id);
          await createWebhook(client, payment, event);
        }
      } else {
        const eventType = providerResult.outcome === 'UNKNOWN' ? 'PaymentOutcomeUnknown' : providerResult.outcome === 'PENDING' ? 'PaymentPending' : providerResult.outcome === 'DECLINED' ? 'AuthorizationFailed' : 'PaymentFailed';
        event = await transition(client, payment, providerResult.outcome, eventType, providerResult, event.id);
        await createWebhook(client, payment, event);
      }
    }
    const response = { paymentId: payment.id, status: payment.status, ledgerState: payment.ledger_state, provider: payment.provider, risk: payment.risk, routing: payment.routing };
    await client.query(`UPDATE idempotency_keys SET response=$3,resource_id=$2 WHERE scope='payment.create' AND idempotency_key=$1`, [idempotencyKey,payment.id,response]);
    await client.query(`INSERT INTO audit_logs(action,actor,resource_id,details) VALUES('PAYMENT_CREATE','api_client',$1,$2)`, [payment.id,{idempotencyKey}]);
    return response;
  });
  await publishOutbox();
  return result;
}

export async function capturePayment(paymentId, amount, key) {
  if (!key) throw new DomainError('Idempotency-Key header is required', 'IDEMPOTENCY_KEY_REQUIRED', 400);
  const result = await tx(async (client) => {
    const requestHash = hash({ paymentId, amount });
    const inserted = await client.query(`INSERT INTO idempotency_keys(scope,idempotency_key,request_hash) VALUES('payment.capture',$1,$2) ON CONFLICT DO NOTHING RETURNING *`, [key,requestHash]);
    if (!inserted.rowCount) {
      const prior = (await client.query(`SELECT * FROM idempotency_keys WHERE scope='payment.capture' AND idempotency_key=$1`, [key])).rows[0];
      if (prior.request_hash !== requestHash) throw new DomainError('Idempotency key reused with different capture', 'IDEMPOTENCY_CONFLICT', 409);
      return { ...prior.response, idempotentReplay: true };
    }
    const payment = (await client.query(`SELECT * FROM payments WHERE id=$1 FOR UPDATE`, [paymentId])).rows[0];
    if (!payment) throw new DomainError('Payment not found', 'PAYMENT_NOT_FOUND', 404);
    if (payment.status !== 'AUTHORIZED') throw new DomainError('Only an authorized payment can be captured', 'NOT_AUTHORIZED', 409);
    const captureAmount = amount || Number(payment.amount);
    const fullyCaptured = await captureInTx(client, payment, captureAmount);
    let event = await transition(client, payment, 'CAPTURED', 'CaptureSucceeded', { amount: captureAmount });
    event = await transition(client, payment, 'SUCCESS', 'PaymentSucceeded', fullyCaptured?{}:{partialCapture:true,releasedAmount:Number(payment.amount)-captureAmount}, event.id);
    await createWebhook(client, payment, event);
    const response = { paymentId, status: payment.status, capturedAmount: payment.captured_amount };
    await client.query(`UPDATE idempotency_keys SET response=$2,resource_id=$3 WHERE scope='payment.capture' AND idempotency_key=$1`, [key,response,paymentId]);
    return response;
  });
  await publishOutbox();
  return result;
}

export async function inquirePayment(paymentId) {
  const result = await tx(async (client) => {
    const payment = (await client.query(`SELECT * FROM payments WHERE id=$1 FOR UPDATE`, [paymentId])).rows[0];
    if (!payment) throw new DomainError('Payment not found', 'PAYMENT_NOT_FOUND', 404);
    if (!['UNKNOWN','PENDING'].includes(payment.status)) return { paymentId, status: payment.status, changed: false };
    const attempt = (await client.query(`SELECT * FROM payment_attempts WHERE payment_id=$1 ORDER BY created_at DESC LIMIT 1`, [paymentId])).rows[0];
    const resolvesToSuccess = attempt?.response?.providerProcessed || payment.scenario?.inquiryOutcome === 'SUCCESS';
    if (!resolvesToSuccess && payment.scenario?.inquiryOutcome !== 'FAILED') return { paymentId, status: payment.status, changed: false, message: 'Provider still cannot confirm; reconciliation is required' };
    if (resolvesToSuccess) {
      const account = (await client.query(`SELECT * FROM financial_accounts WHERE id=$1 FOR UPDATE`, [payment.source_account_id])).rows[0];
      await createHold(client, payment, account);
      let event = await transition(client, payment, 'AUTHORIZED', 'StatusInquiryConfirmedSuccess', {});
      await captureInTx(client, payment, Number(payment.amount));
      event = await transition(client, payment, 'CAPTURED', 'CaptureSucceeded', { amount: Number(payment.amount) }, event.id);
      event = await transition(client, payment, 'SUCCESS', 'PaymentSucceeded', { resolvedFrom: 'UNKNOWN' }, event.id);
      await createWebhook(client, payment, event);
    } else {
      await transition(client, payment, 'FAILED', 'StatusInquiryConfirmedFailure');
    }
    return { paymentId, status: payment.status, changed: true };
  });
  await publishOutbox();
  return result;
}

export async function reversePayment(paymentId, key) {
  if (!key) throw new DomainError('Idempotency-Key header is required', 'IDEMPOTENCY_KEY_REQUIRED', 400);
  const result=await tx(async(client)=>{
    const requestHash=hash({paymentId});
    const inserted=await client.query(`INSERT INTO idempotency_keys(scope,idempotency_key,request_hash) VALUES('payment.reverse',$1,$2) ON CONFLICT DO NOTHING RETURNING *`,[key,requestHash]);
    if(!inserted.rowCount){const prior=(await client.query(`SELECT * FROM idempotency_keys WHERE scope='payment.reverse' AND idempotency_key=$1`,[key])).rows[0];if(prior.request_hash!==requestHash)throw new DomainError('Idempotency conflict','IDEMPOTENCY_CONFLICT',409);return{...prior.response,idempotentReplay:true};}
    const payment=(await client.query(`SELECT * FROM payments WHERE id=$1 FOR UPDATE`,[paymentId])).rows[0];
    if(!payment||!['AUTHORIZED','SUCCESS'].includes(payment.status))throw new DomainError('Payment cannot be reversed','NOT_REVERSIBLE',409);
    if(payment.status==='AUTHORIZED'){
      const hold=(await client.query(`SELECT * FROM holds WHERE payment_id=$1 AND status='ACTIVE' FOR UPDATE`,[paymentId])).rows[0];
      if(!hold)throw new DomainError('Active hold not found','NO_ACTIVE_HOLD',409);
      await client.query(`UPDATE financial_accounts SET held_amount=held_amount-$2 WHERE id=$1`,[hold.account_id,Number(hold.amount)]);
      await client.query(`UPDATE holds SET status='REVERSED' WHERE id=$1`,[hold.id]);
    }else{
      const amount=Number(payment.captured_amount)-Number(payment.refunded_amount);
      if(amount<=0)throw new DomainError('No captured funds remain to reverse','NOT_REVERSIBLE',409);
      await postJournal(client,{paymentId,kind:'REVERSAL',description:'Reverse captured payment',entries:[{accountCode:`MERCHANT_PAYABLE:${payment.merchant_id}`,direction:'DEBIT',amount},{accountCode:`CUSTOMER_FUNDS:${payment.customer_id}`,direction:'CREDIT',amount}]});
      await client.query(`UPDATE financial_accounts SET balance=balance+$2 WHERE id=$1`,[payment.source_account_id,amount]);
    }
    const event=await transition(client,payment,'REVERSED',payment.status==='AUTHORIZED'?'AuthorizationReversed':'PaymentReversed');
    await createWebhook(client,payment,event);
    const response={paymentId,status:'REVERSED'};await client.query(`UPDATE idempotency_keys SET response=$2,resource_id=$3 WHERE scope='payment.reverse' AND idempotency_key=$1`,[key,response,paymentId]);return response;
  });await publishOutbox();return result;
}

export async function retryPayment(paymentId, behavior='SUCCESS') {
  const result=await tx(async(client)=>{
    const payment=(await client.query(`SELECT * FROM payments WHERE id=$1 FOR UPDATE`,[paymentId])).rows[0];
    if(!payment||payment.status!=='FAILED')throw new DomainError('Only a retryable failed payment can be retried','NOT_RETRYABLE',409);
    const attempts=(await client.query(`SELECT * FROM payment_attempts WHERE payment_id=$1 ORDER BY created_at`,[paymentId])).rows;
    const last=attempts.at(-1);const policy=(await client.query(`SELECT value FROM system_config WHERE key='retryPolicy'`)).rows[0].value;
    if(last?.error_class!=='RETRYABLE'||attempts.length>=policy.maxAttempts)throw new DomainError('Retry policy does not allow another attempt','NOT_RETRYABLE',409);
    const delayMs=retryDelay(policy,attempts.length,payment.scenario?.seed||1);
    let event=await recordEvent(client,{aggregateId:paymentId,type:'PaymentRetryScheduled',correlationId:payment.correlation_id,version:payment.version,payload:{attempt:attempts.length+1,delayMs,strategy:policy.strategy}});
    event=await transition(client,payment,'PROCESSING','PaymentRetryStarted',{attempt:attempts.length+1},event.id);
    const account=(await client.query(`SELECT * FROM financial_accounts WHERE id=$1 FOR UPDATE`,[payment.source_account_id])).rows[0];
    const providerResult=simulateProvider({behavior,amount:Number(payment.amount),account});
    await client.query(`INSERT INTO payment_attempts(id,payment_id,provider,status,error_class,error_code,latency_ms,request,response) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[id('att'),paymentId,payment.provider,providerResult.outcome,providerResult.errorClass,providerResult.code,payment.scenario?.latencyMs||80,{amount:Number(payment.amount),retry:attempts.length+1},providerResult]);
    if(providerResult.outcome==='AUTHORIZED'){
      await createHold(client,payment,account);event=await transition(client,payment,'AUTHORIZED','AuthorizationSucceeded',{retry:attempts.length+1},event.id);
      if(payment.capture_method==='AUTOMATIC'){await captureInTx(client,payment,Number(payment.amount));event=await transition(client,payment,'CAPTURED','CaptureSucceeded',{amount:Number(payment.amount)},event.id);event=await transition(client,payment,'SUCCESS','PaymentSucceeded',{resolvedByRetry:true},event.id);await createWebhook(client,payment,event);}
    }else event=await transition(client,payment,providerResult.outcome,providerResult.outcome==='UNKNOWN'?'PaymentOutcomeUnknown':'PaymentFailed',providerResult,event.id);
    return{paymentId,status:payment.status,attempt:attempts.length+1,delayMs};
  });await publishOutbox();return result;
}

export async function listPayments({ status, query, limit = 50 } = {}) {
  const clauses = []; const params = [];
  if (status) { params.push(status); clauses.push(`p.status=$${params.length}`); }
  if (query) { params.push(`%${query}%`); clauses.push(`(p.id ILIKE $${params.length} OR p.provider_reference ILIKE $${params.length} OR m.name ILIKE $${params.length})`); }
  params.push(Math.min(Number(limit), 100));
  const sql = `${paymentView} ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY p.created_at DESC LIMIT $${params.length}`;
  const result = await (await import('../database/db.js')).rows(sql, params);
  return result.map(normalizePayment);
}

export async function getPayment(paymentId) {
  const payment = await one(`${paymentView} WHERE p.id=$1`, [paymentId]);
  if (!payment) throw new DomainError('Payment not found', 'PAYMENT_NOT_FOUND', 404);
  const [attempts, events, ledger, webhooks, refunds, disputes, settlement] = await Promise.all([
    (await import('../database/db.js')).rows(`SELECT * FROM payment_attempts WHERE payment_id=$1 ORDER BY created_at`, [paymentId]),
    (await import('../database/db.js')).rows(`SELECT * FROM domain_events WHERE aggregate_id=$1 ORDER BY created_at,id`, [paymentId]),
    (await import('../database/db.js')).rows(`SELECT l.*,j.kind,j.description FROM ledger_entries l JOIN journal_entries j ON j.id=l.journal_id WHERE j.payment_id=$1 ORDER BY l.created_at,l.id`, [paymentId]),
    (await import('../database/db.js')).rows(`SELECT * FROM webhook_deliveries WHERE payment_id=$1 ORDER BY created_at`, [paymentId]),
    (await import('../database/db.js')).rows(`SELECT * FROM refunds WHERE payment_id=$1 ORDER BY created_at`, [paymentId]),
    (await import('../database/db.js')).rows(`SELECT * FROM disputes WHERE payment_id=$1 ORDER BY created_at`, [paymentId]),
    (await import('../database/db.js')).rows(`SELECT * FROM settlements WHERE payment_ids ? $1 ORDER BY created_at`, [paymentId])
  ]);
  return { ...normalizePayment(payment), attempts, events, ledger, webhooks, refunds, disputes, settlement };
}

function normalizePayment(payment) {
  return {
    ...payment,
    amount: Number(payment.amount), captured_amount: Number(payment.captured_amount), refunded_amount: Number(payment.refunded_amount),
    source_balance: Number(payment.source_balance), source_held: Number(payment.source_held)
  };
}

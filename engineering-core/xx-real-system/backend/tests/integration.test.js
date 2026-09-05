import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { migrate, pool } from '../src/database/db.js';
import { connectRedis, queueDepths } from '../src/events/outbox.js';
import { createActor, createAccount, processWebhooks } from '../src/operations/service.js';
import { capturePayment, createPayment, getPayment, inquirePayment, retryPayment, reversePayment } from '../src/payments/service.js';
import { createRefund } from '../src/refunds/service.js';
import { reconcile, runSettlement } from '../src/settlement/service.js';

const integration = process.env.RUN_INTEGRATION === 'true' ? describe : describe.skip;

integration('PostgreSQL and Redis payment lifecycle', () => {
  let merchant; let customer; let account; let successful;
  const runId = `${Date.now()}-${process.pid}`;

  beforeAll(async () => {
    await migrate();
    await connectRedis();
    customer = await createActor({ type: 'CUSTOMER', name: `Test Customer ${Date.now()}` });
    merchant = await createActor({ type: 'MERCHANT', name: `Test Merchant ${Date.now()}` });
    account = await createAccount({ actorId: customer.id, accountType: 'UPI', balance: 1000000 });
  });

  afterAll(async () => { await pool.end(); });

  it('collapses concurrent duplicate requests into one financial operation', async () => {
    const request = { merchantId:merchant.id,customerId:customer.id,sourceAccountId:account.id,amount:10000,currency:'INR',method:'UPI',scenario:{providerBehavior:'SUCCESS'} };
    const [first,second] = await Promise.all([createPayment(request,`integration-concurrent-${runId}`),createPayment(request,`integration-concurrent-${runId}`)]);
    expect(first.paymentId).toBe(second.paymentId);
    successful = first;
    const detail = await getPayment(first.paymentId);
    expect(detail.status).toBe('SUCCESS');
    expect(detail.ledger).toHaveLength(2);
    const debits=detail.ledger.filter(e=>e.direction==='DEBIT').reduce((sum,e)=>sum+Number(e.amount),0);
    const credits=detail.ledger.filter(e=>e.direction==='CREDIT').reduce((sum,e)=>sum+Number(e.amount),0);
    expect(debits).toBe(credits);
  });

  it('rejects an idempotency key reused with different content', async () => {
    const changed={merchantId:merchant.id,customerId:customer.id,sourceAccountId:account.id,amount:10001,currency:'INR',method:'UPI',scenario:{providerBehavior:'SUCCESS'}};
    await expect(createPayment(changed,`integration-concurrent-${runId}`)).rejects.toMatchObject({code:'IDEMPOTENCY_CONFLICT'});
  });

  it('resolves a provider-processed lost response by status inquiry', async () => {
    const unknown=await createPayment({merchantId:merchant.id,customerId:customer.id,sourceAccountId:account.id,amount:12000,currency:'INR',method:'UPI',scenario:{providerBehavior:'LOST_RESPONSE'}},`integration-unknown-${runId}`);
    expect(unknown.status).toBe('UNKNOWN');
    expect(await inquirePayment(unknown.paymentId)).toMatchObject({status:'SUCCESS',changed:true});
  });

  it('releases authorization holds on reversal and supports final partial capture', async () => {
    const authorized=await createPayment({merchantId:merchant.id,customerId:customer.id,sourceAccountId:account.id,amount:7000,currency:'INR',method:'CARD',captureMethod:'MANUAL',scenario:{providerBehavior:'SUCCESS'}},`integration-auth-${runId}`);
    expect(authorized.status).toBe('AUTHORIZED');
    expect(await reversePayment(authorized.paymentId,`integration-reverse-${runId}`)).toMatchObject({status:'REVERSED'});
    const partial=await createPayment({merchantId:merchant.id,customerId:customer.id,sourceAccountId:account.id,amount:7000,currency:'INR',method:'CARD',captureMethod:'MANUAL',scenario:{providerBehavior:'SUCCESS'}},`integration-partial-${runId}`);
    expect(await capturePayment(partial.paymentId,4000,`integration-capture-${runId}`)).toMatchObject({status:'SUCCESS',capturedAmount:4000});
  });

  it('applies the retry policy only to retryable attempts', async () => {
    const failed=await createPayment({merchantId:merchant.id,customerId:customer.id,sourceAccountId:account.id,amount:6000,currency:'INR',method:'UPI',scenario:{providerBehavior:'PROVIDER_503'}},`integration-retry-${runId}`);
    expect(failed.status).toBe('FAILED');
    const retried=await retryPayment(failed.paymentId,'SUCCESS');
    expect(retried).toMatchObject({status:'SUCCESS',attempt:2});
    expect(retried.delayMs).toBeGreaterThanOrEqual(0);
  });

  it('posts refunds, delivers webhooks, settles, reconciles, and publishes queues', async () => {
    const refund=await createRefund(successful.paymentId,{amount:2500,reason:'integration_test'},`integration-refund-${runId}`);
    expect(refund.status).toBe('COMPLETED');
    const hooks=await processWebhooks();
    expect(hooks.processed.length).toBeGreaterThan(0);
    const settlement=await runSettlement(merchant.id);
    expect(settlement.net).toBeGreaterThan(0);
    const report=await reconcile();
    expect(report.status).toBe('MATCHED');
    const queues=await queueDepths();
    expect(queues.available).toBe(true);
    expect(Object.keys(queues.queues).length).toBeGreaterThan(0);
  });
});

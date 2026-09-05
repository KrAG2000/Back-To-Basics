import { DomainError, hash, id } from '../lib.js';
import { tx } from '../database/db.js';
import { postJournal } from '../ledger/service.js';
import { recordEvent, publishOutbox } from '../events/outbox.js';
import { assertTransition } from '../payments/stateMachine.js';

export async function createRefund(paymentId, input, key) {
  if (!key) throw new DomainError('Idempotency-Key header is required', 'IDEMPOTENCY_KEY_REQUIRED', 400);
  const result = await tx(async (client) => {
    const requestHash = hash({ paymentId, ...input });
    const inserted = await client.query(`INSERT INTO idempotency_keys(scope,idempotency_key,request_hash) VALUES('refund.create',$1,$2) ON CONFLICT DO NOTHING RETURNING *`, [key, requestHash]);
    if (!inserted.rowCount) {
      const prior = (await client.query(`SELECT * FROM idempotency_keys WHERE scope='refund.create' AND idempotency_key=$1`, [key])).rows[0];
      if (prior.request_hash !== requestHash) throw new DomainError('Idempotency key reused with a different refund', 'IDEMPOTENCY_CONFLICT', 409);
      return { ...prior.response, idempotentReplay: true };
    }
    const payment = (await client.query(`SELECT * FROM payments WHERE id=$1 FOR UPDATE`, [paymentId])).rows[0];
    if (!payment || !['SUCCESS','PARTIALLY_REFUNDED','SETTLED'].includes(payment.status)) throw new DomainError('Payment is not refundable', 'NOT_REFUNDABLE', 409);
    const amount = Number(input.amount || (Number(payment.captured_amount) - Number(payment.refunded_amount)));
    const remaining = Number(payment.captured_amount) - Number(payment.refunded_amount);
    if (amount <= 0 || amount > remaining) throw new DomainError('Refund exceeds refundable amount', 'REFUND_TOO_LARGE', 409);
    const refund = { id: id('rfnd'), amount, status: input.behavior === 'FAIL' ? 'FAILED' : 'COMPLETED' };
    await client.query(`INSERT INTO refunds(id,payment_id,amount,status,reason) VALUES($1,$2,$3,$4,$5)`, [refund.id,paymentId,amount,refund.status,input.reason || 'requested_by_merchant']);
    if (refund.status === 'FAILED') {
      await recordEvent(client, { aggregateId: paymentId, type: 'RefundFailed', correlationId: payment.correlation_id, version: payment.version, payload: { refundId: refund.id, amount } });
    } else {
      if (payment.status !== 'SETTLED') {
        assertTransition(payment.status, 'REFUND_PENDING');
        payment.status = 'REFUND_PENDING'; payment.version += 1;
        await client.query(`UPDATE payments SET status='REFUND_PENDING',version=$2 WHERE id=$1`, [paymentId,payment.version]);
      }
      await postJournal(client, { paymentId, kind: 'REFUND', description: 'Return captured funds to the customer', entries: [
        { accountCode: `MERCHANT_PAYABLE:${payment.merchant_id}`, direction: 'DEBIT', amount },
        { accountCode: `CUSTOMER_FUNDS:${payment.customer_id}`, direction: 'CREDIT', amount }
      ] });
      await client.query(`UPDATE financial_accounts SET balance=balance+$2 WHERE id=$1`, [payment.source_account_id,amount]);
      const refunded = Number(payment.refunded_amount) + amount;
      const nextStatus = refunded === Number(payment.captured_amount) ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      if (payment.status !== 'SETTLED') {
        assertTransition(payment.status, nextStatus);
        payment.status = nextStatus; payment.version += 1;
      }
      await client.query(`UPDATE payments SET refunded_amount=$2,status=$3,version=$4,updated_at=now() WHERE id=$1`, [paymentId,refunded,payment.status,payment.version]);
      await recordEvent(client, { aggregateId: paymentId, type: 'RefundCompleted', correlationId: payment.correlation_id, version: payment.version, payload: { refundId: refund.id, amount, paymentStatus: payment.status } });
    }
    const response = { refundId: refund.id, paymentId, amount, status: refund.status, paymentStatus: payment.status };
    await client.query(`UPDATE idempotency_keys SET response=$2,resource_id=$3 WHERE scope='refund.create' AND idempotency_key=$1`, [key,response,refund.id]);
    return response;
  });
  await publishOutbox();
  return result;
}

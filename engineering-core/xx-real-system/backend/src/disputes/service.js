import { DomainError, id } from '../lib.js';
import { tx } from '../database/db.js';
import { postJournal } from '../ledger/service.js';
import { recordEvent, publishOutbox } from '../events/outbox.js';
import { assertTransition } from '../payments/stateMachine.js';

export async function openDispute(paymentId, input) {
  const result = await tx(async (client) => {
    const payment = (await client.query(`SELECT * FROM payments WHERE id=$1 FOR UPDATE`, [paymentId])).rows[0];
    if (!payment || !['SUCCESS','PARTIALLY_REFUNDED'].includes(payment.status)) throw new DomainError('Payment cannot be disputed', 'NOT_DISPUTABLE', 409);
    assertTransition(payment.status, 'DISPUTED');
    const dispute = { id: id('dsp'), amount: Number(input.amount || payment.captured_amount), status: 'OPEN' };
    await client.query(`INSERT INTO disputes(id,payment_id,amount,reason,status) VALUES($1,$2,$3,$4,$5)`, [dispute.id,paymentId,dispute.amount,input.reason || 'customer_claim',dispute.status]);
    await client.query(`UPDATE payments SET status='DISPUTED',version=version+1 WHERE id=$1`, [paymentId]);
    await recordEvent(client, { aggregateId: paymentId, type: 'DisputeOpened', correlationId: payment.correlation_id, version: payment.version+1, payload: { disputeId: dispute.id, amount: dispute.amount } });
    return { ...dispute, paymentId };
  });
  await publishOutbox(); return result;
}

export async function resolveDispute(disputeId, outcome) {
  const result = await tx(async (client) => {
    const dispute = (await client.query(`SELECT d.*,p.status payment_status,p.merchant_id,p.customer_id,p.correlation_id,p.version,p.source_account_id FROM disputes d JOIN payments p ON p.id=d.payment_id WHERE d.id=$1 FOR UPDATE`, [disputeId])).rows[0];
    if (!dispute || dispute.status !== 'OPEN') throw new DomainError('Open dispute not found', 'DISPUTE_NOT_FOUND', 404);
    const won = outcome === 'MERCHANT_WON';
    const next = won ? 'SUCCESS' : 'CHARGEBACK';
    assertTransition(dispute.payment_status, next);
    await client.query(`UPDATE disputes SET status=$2 WHERE id=$1`, [disputeId,won?'MERCHANT_WON':'MERCHANT_LOST']);
    await client.query(`UPDATE payments SET status=$2,version=version+1 WHERE id=$1`, [dispute.payment_id,next]);
    if (!won) {
      const amount = Number(dispute.amount);
      await postJournal(client, { paymentId: dispute.payment_id, kind:'CHARGEBACK', description:'Chargeback awarded to customer', entries:[
        {accountCode:`MERCHANT_RESERVE:${dispute.merchant_id}`,direction:'DEBIT',amount},
        {accountCode:`CUSTOMER_FUNDS:${dispute.customer_id}`,direction:'CREDIT',amount}
      ]});
      await client.query(`UPDATE financial_accounts SET balance=balance+$2 WHERE id=$1`, [dispute.source_account_id,amount]);
    }
    await recordEvent(client, { aggregateId: dispute.payment_id, type: won?'ChargebackReversed':'ChargebackCreated', correlationId: dispute.correlation_id, version:dispute.version+1,payload:{disputeId,outcome} });
    return { disputeId, paymentId:dispute.payment_id, outcome, paymentStatus:next };
  });
  await publishOutbox(); return result;
}

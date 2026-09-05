import { DomainError, id } from '../lib.js';
import { tx, rows } from '../database/db.js';
import { postJournal, verifyLedger } from '../ledger/service.js';
import { recordEvent, publishOutbox } from '../events/outbox.js';

export async function runSettlement(merchantId) {
  const result = await tx(async (client) => {
    const merchant = (await client.query(`SELECT * FROM actors WHERE id=$1 AND type='MERCHANT'`, [merchantId])).rows[0];
    if (!merchant) throw new DomainError('Merchant not found', 'MERCHANT_NOT_FOUND', 404);
    const payments = (await client.query(
      `SELECT * FROM payments WHERE merchant_id=$1 AND ledger_state='PENDING_SETTLEMENT' AND status IN ('SUCCESS','PARTIALLY_REFUNDED','REFUNDED') FOR UPDATE`, [merchantId]
    )).rows;
    if (!payments.length) throw new DomainError('No unsettled payments for this merchant', 'NOTHING_TO_SETTLE', 409);
    const gross = payments.reduce((sum,p) => sum + Number(p.captured_amount), 0);
    const refunds = payments.reduce((sum,p) => sum + Number(p.refunded_amount), 0);
    const eligible = gross - refunds;
    const fees = Math.floor(eligible * 0.02);
    const taxes = Math.floor(fees * 0.18);
    const net = eligible - fees - taxes;
    const settlementId = id('stl');
    await postJournal(client, { kind: 'SETTLEMENT', description: `Settlement batch ${settlementId}`, entries: [
      { accountCode: `MERCHANT_PAYABLE:${merchantId}`, direction: 'DEBIT', amount: eligible },
      { accountCode: `MERCHANT_BANK:${merchantId}`, direction: 'CREDIT', amount: net },
      ...(fees ? [{ accountCode: 'PLATFORM_FEE_REVENUE', direction: 'CREDIT', amount: fees }] : []),
      ...(taxes ? [{ accountCode: 'TAX_PAYABLE', direction: 'CREDIT', amount: taxes }] : [])
    ] });
    await client.query(`UPDATE financial_accounts SET balance=balance+$2 WHERE actor_id=$1 AND account_type='MERCHANT'`, [merchantId,net]);
    await client.query(`INSERT INTO settlements(id,merchant_id,status,gross,refunds,fees,taxes,net,payment_ids) VALUES($1,$2,'COMPLETED',$3,$4,$5,$6,$7,$8)`, [settlementId,merchantId,gross,refunds,fees,taxes,net,JSON.stringify(payments.map(p=>p.id))]);
    for (const payment of payments) {
      await client.query(`UPDATE payments SET ledger_state='SETTLED',status='SETTLED',version=version+1,updated_at=now() WHERE id=$1`, [payment.id]);
      await recordEvent(client, { aggregateId: payment.id, type: 'SettlementCompleted', correlationId: payment.correlation_id, version: payment.version+1, payload: { settlementId, net } });
    }
    return { id: settlementId, merchantId, transactionCount: payments.length, gross, refunds, fees, taxes, net, paymentIds: payments.map(p=>p.id), status: 'COMPLETED' };
  });
  await publishOutbox();
  return result;
}

export async function listSettlements() {
  return (await rows(`SELECT s.*,a.name merchant_name FROM settlements s JOIN actors a ON a.id=s.merchant_id ORDER BY s.created_at DESC`)).map(s => ({...s,gross:Number(s.gross),refunds:Number(s.refunds),fees:Number(s.fees),taxes:Number(s.taxes),net:Number(s.net)}));
}

export async function reconcile() {
  const result = await tx(async (client) => {
    const payments = (await client.query(`SELECT * FROM payments ORDER BY created_at`)).rows;
    const mismatches = [];
    for (const payment of payments) {
      const ledger = await verifyLedger(client, payment.id);
      if (!ledger.balanced) mismatches.push({ paymentId: payment.id, type: 'LEDGER_IMBALANCE', expected: ledger.debits, actual: ledger.credits });
      if (['SUCCESS','SETTLED','PARTIALLY_REFUNDED','REFUNDED'].includes(payment.status) && Number(payment.captured_amount) === 0) {
        mismatches.push({ paymentId: payment.id, type: 'MISSING_CAPTURE', expected: Number(payment.amount), actual: 0 });
      }
      if (Number(payment.refunded_amount) > Number(payment.captured_amount)) mismatches.push({ paymentId: payment.id, type: 'REFUND_MISMATCH', expected: Number(payment.captured_amount), actual: Number(payment.refunded_amount) });
      if (payment.scenario?.reconciliationMismatch) mismatches.push({ paymentId: payment.id, type: 'PROVIDER_STATUS_MISMATCH', expected: payment.status, actual: 'FAILED' });
    }
    const report = { id: id('rec'), status: mismatches.length ? 'MISMATCHES_FOUND' : 'MATCHED', checkedCount: payments.length, mismatches };
    await client.query(`INSERT INTO reconciliation_reports(id,status,checked_count,mismatches) VALUES($1,$2,$3,$4)`, [report.id,report.status,report.checkedCount,JSON.stringify(mismatches)]);
    await recordEvent(client, { aggregateId: report.id, type: mismatches.length ? 'ReconciliationMismatchDetected' : 'ReconciliationCompleted', correlationId: id('corr'), payload: report });
    return report;
  });
  await publishOutbox();
  return result;
}

export async function listReconciliations() { return rows(`SELECT * FROM reconciliation_reports ORDER BY created_at DESC LIMIT 50`); }

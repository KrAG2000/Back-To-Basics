import { DomainError, id } from '../lib.js';

export async function postJournal(client, { paymentId = null, kind, description, currency = 'INR', entries }) {
  const debits = entries.filter((entry) => entry.direction === 'DEBIT').reduce((sum, entry) => sum + entry.amount, 0);
  const credits = entries.filter((entry) => entry.direction === 'CREDIT').reduce((sum, entry) => sum + entry.amount, 0);
  if (debits !== credits || debits <= 0) {
    throw new DomainError('Journal is not balanced', 'LEDGER_IMBALANCE', 409, { debits, credits });
  }
  const journalId = id('jrn');
  await client.query(`INSERT INTO journal_entries(id,payment_id,kind,description) VALUES($1,$2,$3,$4)`, [journalId, paymentId, kind, description]);
  for (const entry of entries) {
    await client.query(
      `INSERT INTO ledger_entries(id,journal_id,account_code,direction,amount,currency) VALUES($1,$2,$3,$4,$5,$6)`,
      [id('led'), journalId, entry.accountCode, entry.direction, entry.amount, currency]
    );
  }
  return journalId;
}

export async function verifyLedger(client, paymentId = null) {
  const where = paymentId ? 'WHERE j.payment_id=$1' : '';
  const params = paymentId ? [paymentId] : [];
  const result = await client.query(
    `SELECT COALESCE(SUM(CASE WHEN l.direction='DEBIT' THEN l.amount ELSE 0 END),0)::bigint AS debits,
            COALESCE(SUM(CASE WHEN l.direction='CREDIT' THEN l.amount ELSE 0 END),0)::bigint AS credits
       FROM ledger_entries l JOIN journal_entries j ON j.id=l.journal_id ${where}`, params
  );
  return { debits: Number(result.rows[0].debits), credits: Number(result.rows[0].credits), balanced: result.rows[0].debits === result.rows[0].credits };
}

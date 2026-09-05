import { DomainError, id } from '../lib.js';
import { one, rows } from '../database/db.js';
import { createPayment } from '../payments/service.js';

export async function createMandate(input) {
  const mandateId = id('mdt');
  const result = await (await import('../database/db.js')).pool.query(
    `INSERT INTO mandates(id,customer_id,merchant_id,source_account_id,amount,frequency,status,next_run_at,expires_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [mandateId,input.customerId,input.merchantId,input.sourceAccountId,input.amount,input.frequency || 'MONTHLY',input.authorized===false?'CREATED':'AUTHORIZED',input.nextRunAt || new Date().toISOString(),input.expiresAt || new Date(Date.now()+365*86400000).toISOString()]
  );
  return result.rows[0];
}

export async function runMandate(mandateId, scenario = {}) {
  const mandate = await one(`SELECT * FROM mandates WHERE id=$1`, [mandateId]);
  if (!mandate || mandate.status !== 'AUTHORIZED') throw new DomainError('Authorized mandate not found', 'MANDATE_NOT_AUTHORIZED', 409);
  if (new Date(mandate.expires_at) < new Date()) {
    await (await import('../database/db.js')).pool.query(`UPDATE mandates SET status='EXPIRED' WHERE id=$1`, [mandateId]);
    throw new DomainError('Mandate has expired', 'MANDATE_EXPIRED', 409);
  }
  const payment = await createPayment({
    merchantId:mandate.merchant_id,customerId:mandate.customer_id,sourceAccountId:mandate.source_account_id,
    amount:Number(mandate.amount),currency:'INR',method:'MANDATE',scenario
  }, `mandate:${mandateId}:${new Date(mandate.next_run_at).toISOString()}`);
  const next = new Date(mandate.next_run_at);
  if (mandate.frequency === 'DAILY') next.setUTCDate(next.getUTCDate()+1);
  else if (mandate.frequency === 'WEEKLY') next.setUTCDate(next.getUTCDate()+7);
  else next.setUTCMonth(next.getUTCMonth()+1);
  await (await import('../database/db.js')).pool.query(`UPDATE mandates SET next_run_at=$2 WHERE id=$1`, [mandateId,next.toISOString()]);
  return { mandateId,nextRunAt:next.toISOString(),payment };
}

export async function cancelMandate(mandateId) {
  const result = await (await import('../database/db.js')).pool.query(`UPDATE mandates SET status='CANCELLED' WHERE id=$1 AND status IN ('CREATED','AUTHORIZED') RETURNING *`, [mandateId]);
  if (!result.rowCount) throw new DomainError('Active mandate not found', 'MANDATE_NOT_FOUND', 404);
  return result.rows[0];
}

export const listMandates = () => rows(`SELECT * FROM mandates ORDER BY created_at DESC`);

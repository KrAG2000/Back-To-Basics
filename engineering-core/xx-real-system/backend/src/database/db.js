import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;
export const pool = new Pool({ connectionString: config.databaseUrl, max: 15 });

export async function migrate() {
  const schemaPath = fileURLToPath(new URL('./schema.sql', import.meta.url));
  await pool.query(await readFile(schemaPath, 'utf8'));
  await seed();
}

async function seed() {
  await pool.query(`
    INSERT INTO actors (id,type,name,email) VALUES
      ('cus_demo','CUSTOMER','Asha Customer','asha@example.test'),
      ('mer_demo','MERCHANT','Orbit Books','ops@orbit.example.test')
    ON CONFLICT DO NOTHING;
    INSERT INTO financial_accounts (id,actor_id,account_type,currency,balance,synthetic_identifier) VALUES
      ('acc_customer','cus_demo','BANK','INR',10000000,'asha@atlasbank'),
      ('acc_merchant','mer_demo','MERCHANT','INR',0,'merchant-orbit'),
      ('acc_platform',NULL,'PLATFORM','INR',0,'platform-clearing')
    ON CONFLICT DO NOTHING;
    INSERT INTO system_config (key,value) VALUES
      ('providers', '[{"id":"atlas_upi","methods":["UPI","BANK","MANDATE"],"enabled":true,"successRate":99,"latency":80,"priority":1},{"id":"cardstream","methods":["CARD","WALLET"],"enabled":true,"successRate":97,"latency":120,"priority":1},{"id":"fallback_pay","methods":["UPI","BANK","CARD","WALLET","NET_BANKING","MANDATE"],"enabled":true,"successRate":92,"latency":180,"priority":9}]'),
      ('workers', '{"payments":true,"webhooks":true,"settlement":true,"reconciliation":true}'),
      ('retryPolicy', '{"strategy":"EXPONENTIAL_JITTER","maxAttempts":4,"baseDelayMs":250}')
    ON CONFLICT DO NOTHING;
  `);
}

export async function tx(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export const rows = async (text, params = []) => (await pool.query(text, params)).rows;
export const one = async (text, params = []) => (await pool.query(text, params)).rows[0] || null;

export async function waitForDatabase(attempts = 20) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (error) {
      if (attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

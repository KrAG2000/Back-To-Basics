import Redis from 'ioredis';
import { config } from '../config.js';
import { id } from '../lib.js';
import { pool } from '../database/db.js';

let redis;
let redisAvailable = false;

export function redisClient() {
  if (!redis) {
    redis = new Redis(config.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
    redis.on('error', () => { redisAvailable = false; });
  }
  return redis;
}

export async function connectRedis() {
  try {
    const client = redisClient();
    if (client.status === 'wait') await client.connect();
    await client.ping();
    redisAvailable = true;
  } catch {
    redisAvailable = false;
  }
  return redisAvailable;
}

export function redisStatus() { return redisAvailable; }

export async function recordEvent(client, { aggregateId, type, correlationId, causationId = null, version = 1, payload = {} }) {
  const event = { id: id('evt'), aggregateId, type, correlationId, causationId, version, payload };
  await client.query(
    `INSERT INTO domain_events(id,aggregate_id,event_type,correlation_id,causation_id,version,payload)
     VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [event.id, aggregateId, type, correlationId, causationId, version, payload]
  );
  await client.query(
    `INSERT INTO outbox(id,event_id,topic,payload) VALUES($1,$2,$3,$4)`,
    [id('out'), event.id, `payments.${type}`, { ...event, createdAt: new Date().toISOString() }]
  );
  return event;
}

export async function publishOutbox(limit = 100) {
  const client = await pool.connect();
  let published = 0;
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT * FROM outbox WHERE status='PENDING' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT $1`, [limit]
    );
    for (const item of result.rows) {
      try {
        if (redisAvailable) await redisClient().lpush(`queue:${item.topic}`, JSON.stringify(item.payload));
        await client.query(`UPDATE outbox SET status='PUBLISHED', attempts=attempts+1, published_at=now() WHERE id=$1`, [item.id]);
        published += 1;
      } catch {
        await client.query(`UPDATE outbox SET attempts=attempts+1 WHERE id=$1`, [item.id]);
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return published;
}

export async function queueDepths() {
  if (!redisAvailable) return { available: false, queues: {} };
  const keys = await redisClient().keys('queue:*');
  const entries = await Promise.all(keys.map(async (key) => [key.replace('queue:', ''), await redisClient().llen(key)]));
  return { available: true, queues: Object.fromEntries(entries) };
}

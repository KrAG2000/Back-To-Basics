import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || 'postgres://payments:payments@localhost:5432/payments',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  apiKey: process.env.API_KEY || 'lab_test_key',
  webhookSecret: process.env.WEBHOOK_SECRET || 'lab_webhook_secret',
  logLevel: process.env.LOG_LEVEL || 'info',
  autoMigrate: process.env.AUTO_MIGRATE !== 'false'
};

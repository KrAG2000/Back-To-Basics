import { config } from './config.js';
import { migrate, one, waitForDatabase } from './database/db.js';
import { connectRedis, publishOutbox } from './events/outbox.js';
import { processWebhooks } from './operations/service.js';
import { createApp } from './api/app.js';

async function start() {
  await waitForDatabase();
  if (config.autoMigrate) await migrate();
  await connectRedis();
  const app=createApp();
  app.listen(config.port,()=>console.log(JSON.stringify({level:'info',service:'payment-lab',message:`Listening on http://localhost:${config.port}`})));
  setInterval(async()=>{
    try {
      const workers=await one(`SELECT value FROM system_config WHERE key='workers'`);
      if (workers?.value?.payments) await publishOutbox();
      if (workers?.value?.webhooks) await processWebhooks();
    } catch (error) { console.error(JSON.stringify({level:'error',service:'worker',message:error.message})); }
  },2000).unref();
}

start().catch((error)=>{console.error(error);process.exit(1);});

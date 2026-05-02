import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectMongoIfEnabled } from './config/db.js';
import { getRepositories } from './repositories/index.js';
import { seedDemoData } from './seed/seedDemoData.js';

async function bootstrap() {
  await connectMongoIfEnabled();
  const { authRepository, eventsRepository, domainRepository } = getRepositories();
  let seedResult = null;

  if (env.seedDemoData) {
    seedResult = await seedDemoData(authRepository, eventsRepository, domainRepository);
  }

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`Backend listening on http://localhost:${env.port}`);
    console.log(`Storage mode: ${env.storageMode}`);
    console.log(`Seed demo data: ${env.seedDemoData ? 'enabled' : 'disabled'}`);

    if (seedResult) {
      console.log(`Seeded admin: ${seedResult.adminEmail}`);
      console.log(`Seeded organizer: ${seedResult.organizerEmail}`);
      console.log(`Demo events available: ${seedResult.demoEventCount}`);
    }
  });
}

bootstrap().catch((err) => {
  console.error('Fatal startup error', err);
  process.exit(1);
});

import { closeMongo } from './db/mongo.js';
import { createApp } from './create-app.js';

const PORT = Number(process.env.PORT ?? 3001);

async function main() {
  const app = await createApp();
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mini Apty API listening on http://localhost:${PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully`);
    server.close(async () => {
      await closeMongo();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

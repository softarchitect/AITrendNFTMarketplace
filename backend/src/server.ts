import { createApp } from "./app";
import { config } from "./config";
import { logger } from "./logger";
import { initializeStorePersistence } from "./store/inMemoryStore";

async function bootstrap() {
  await initializeStorePersistence();
  const app = createApp();
  app.listen(config.port, () => {
    logger.info({ port: config.port }, "TrendMint backend listening");
  });
}

bootstrap().catch((error) => {
  logger.error({ err: error }, "Failed to bootstrap backend");
  process.exit(1);
});

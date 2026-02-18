import { createApp } from "./app";
import { config } from "./config";
import { logger } from "./logger";
import { createServices, Services } from "./services/serviceContainer";
import { initializeStorePersistence } from "./store/inMemoryStore";

function resolveAutoMintBatchSize(services: Services): number {
  const controls = services.db.adminControls;
  const baseBatch = Math.max(1, Math.min(10, controls.autoMintBatchSize ?? 1));
  const dailyMinimumTarget = Math.max(0, controls.dailyMinimumTarget ?? 0);
  if (dailyMinimumTarget <= 0) {
    return baseBatch;
  }

  const now = new Date();
  const hourKey = now.toISOString().slice(0, 13);
  const currentHourCount = services.db.mintCounters.perHour[hourKey] ?? 0;
  const remainingTodayCap = Math.max(0, controls.dailyCap - services.db.mintCounters.perDay);
  const remainingHourCap = Math.max(0, controls.hourlyCap - currentHourCount);
  const remainingToTarget = Math.max(0, dailyMinimumTarget - services.db.mintCounters.perDay);
  if (remainingToTarget <= 0) {
    return Math.min(baseBatch, remainingTodayCap, remainingHourCap);
  }

  const remainingHoursToday = Math.max(1, 24 - now.getUTCHours());
  const requiredPerHour = Math.ceil(remainingToTarget / remainingHoursToday);
  const catchUpBatch = Math.max(baseBatch, requiredPerHour);
  return Math.max(0, Math.min(10, catchUpBatch, remainingTodayCap, remainingHourCap));
}

function startAutoMintScheduler(services: Services): void {
  let lastRunAt = 0;
  let running = false;
  const tickMs = 60_000;

  setInterval(() => {
    if (running) return;
    if (!services.db.adminControls.pipelineEnabled || !services.db.adminControls.scheduleEnabled) {
      return;
    }

    const intervalMs = Math.max(1, services.db.adminControls.autoMintIntervalMinutes) * 60_000;
    if (Date.now() - lastRunAt < intervalMs) {
      return;
    }

    running = true;
    lastRunAt = Date.now();
    void (async () => {
      const batchSize = resolveAutoMintBatchSize(services);
      if (batchSize <= 0) {
        services.db.appendAuditLog("auto_mint_cycle_skipped", "system", {
          reason: "No remaining mint capacity for this hour/day",
          dailyCap: services.db.adminControls.dailyCap,
          hourlyCap: services.db.adminControls.hourlyCap,
          perDay: services.db.mintCounters.perDay,
          dailyMinimumTarget: services.db.adminControls.dailyMinimumTarget
        });
        return;
      }
      let successCount = 0;
      for (let index = 0; index < batchSize; index += 1) {
        try {
          await services.pipeline.runAutomatedMintCycle({
            limit: services.db.adminControls.trendTopicLimit
          });
          successCount += 1;
        } catch (error) {
          // Stop the current scheduler batch if caps/eligibility are reached.
          logger.warn({ err: error, index }, "Automated mint cycle attempt failed");
          break;
        }
      }
      services.db.appendAuditLog("auto_mint_cycle_triggered", "system", {
        trendTopicLimit: services.db.adminControls.trendTopicLimit,
        autoMintBatchSize: batchSize,
        dailyMinimumTarget: services.db.adminControls.dailyMinimumTarget,
        mintedCount: successCount
      });
      logger.info({ batchSize, successCount }, "Automated mint scheduler batch completed");
    })()
      .catch((error) => {
        services.db.appendAuditLog("auto_mint_cycle_failed", "system", {
          reason: error instanceof Error ? error.message : "Auto mint cycle failed"
        });
        logger.error({ err: error }, "Automated mint cycle failed");
      })
      .finally(() => {
        running = false;
      });
  }, tickMs);

  logger.info({ tickMs }, "Auto mint scheduler started");
}

async function bootstrap() {
  await initializeStorePersistence();
  const services = createServices();
  startAutoMintScheduler(services);
  const app = createApp(services);
  app.listen(config.port, () => {
    logger.info({ port: config.port }, "TrendMint backend listening");
  });
}

bootstrap().catch((error) => {
  logger.error({ err: error }, "Failed to bootstrap backend");
  process.exit(1);
});

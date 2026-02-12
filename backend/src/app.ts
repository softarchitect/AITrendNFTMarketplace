import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import path from "path";
import { config } from "./config";
import { logger } from "./logger";
import { createAdminRoutes } from "./routes/adminRoutes";
import { createMarketplaceRoutes } from "./routes/marketplaceRoutes";
import { createPartnerRoutes } from "./routes/partnerRoutes";
import { createWebhookRoutes } from "./routes/webhookRoutes";
import { createServices, Services } from "./services/serviceContainer";

export function createApp(services: Services = createServices()) {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use("/generated", express.static(path.resolve(process.cwd(), "generated")));
  app.use(
    pinoHttp({
      logger
    })
  );
  app.set("paymentSignatureHeader", config.payment.webhookSignatureHeader);

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "trendmint-backend",
      env: config.nodeEnv
    });
  });

  app.get("/milestone2/status", (_req, res) => {
    res.json({
      modules: [
        "trend_ingestion",
        "prompt_builder",
        "ai_adapter",
        "ipfs_metadata",
        "minter_service",
        "indexer",
        "partner_api",
        "payment_webhook"
      ]
    });
  });

  app.use("/api/admin", createAdminRoutes(services));
  app.use("/api/marketplace", createMarketplaceRoutes(services));
  app.use("/api/partner", createPartnerRoutes(services));
  app.use("/api/webhooks", createWebhookRoutes(services));

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err: error }, "Unhandled API error");
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected server error"
    });
  });

  return app;
}

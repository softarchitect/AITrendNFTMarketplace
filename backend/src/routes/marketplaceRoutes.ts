import { Router } from "express";
import { z } from "zod";
import { Services } from "../services/serviceContainer";

export function createMarketplaceRoutes(services: Services): Router {
  const router = Router();

  router.get("/listings", (_req, res) => {
    return res.json(services.indexer.listAll());
  });

  router.get("/ownership/:wallet", (req, res) => {
    return res.json(services.indexer.listByOwner(req.params.wallet));
  });

  router.get("/receipts/:wallet", (req, res) => {
    const receipts = [...services.db.receipts.values()].filter(
      (receipt) => receipt.wallet.toLowerCase() === req.params.wallet.toLowerCase()
    );
    return res.json(receipts);
  });

  router.post("/purchase-session", async (req, res, next) => {
    const schema = z.object({
      amountUsd: z.number().positive(),
      currency: z.string().default("USD")
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      const payment = await services.payment.createPaymentSession(parsed.data);
      return res.status(201).json(payment);
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

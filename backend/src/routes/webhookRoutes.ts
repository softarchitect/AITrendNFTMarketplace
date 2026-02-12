import { Router } from "express";
import { Services } from "../services/serviceContainer";

export function createWebhookRoutes(services: Services): Router {
  const router = Router();

  router.post("/payment", (req, res) => {
    const signatureHeaderName = req.app.get("paymentSignatureHeader") as string;
    const signature = req.headers[signatureHeaderName] as string | undefined;
    if (!services.payment.isValidWebhookSignature(req.body, signature)) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    try {
      const event = services.payment.parseWebhook(req.body);
      const updated = services.payment.updateByExternalRef(event.externalRef, event.status);
      return res.json(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid webhook payload";
      return res.status(400).json({ error: message });
    }
  });

  return router;
}

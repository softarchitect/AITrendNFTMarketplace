import { Router } from "express";
import { z } from "zod";
import { Services } from "../services/serviceContainer";

function requireIdempotencyKey(headers: Record<string, string | string[] | undefined>): string {
  const value = headers["x-idempotency-key"];
  if (typeof value !== "string" || value.length < 8) {
    throw new Error("Missing valid x-idempotency-key header");
  }
  return value;
}

export function createPartnerRoutes(services: Services): Router {
  const router = Router();

  router.post("/bulk-purchase", async (req, res, next) => {
    const schema = z.object({
      buyerWallet: z.string().min(4),
      amountUsd: z.number().positive(),
      currency: z.string().default("USD"),
      tokenIds: z.array(z.number().int().positive()).min(1)
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    let idempotencyKey: string;
    try {
      idempotencyKey = requireIdempotencyKey(req.headers);
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid header" });
    }

    const cached = services.db.idempotency.get(idempotencyKey);
    if (cached) {
      return res.json({ reused: true, paymentId: cached });
    }

    try {
      const payment = await services.payment.createPaymentSession({
        amountUsd: parsed.data.amountUsd,
        currency: parsed.data.currency
      });
      services.db.idempotency.set(idempotencyKey, payment.id);
      return res.status(201).json({
        paymentId: payment.id,
        externalRef: payment.externalRef,
        status: payment.status
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/bulk-transfer", async (req, res, next) => {
    const schema = z.object({
      paymentExternalRef: z.string().min(5),
      fromWallet: z.string().min(4),
      toWallet: z.string().min(4),
      tokenIds: z.array(z.number().int().positive()).min(1)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const payment = [...services.db.payments.values()].find(
      (item) => item.externalRef === parsed.data.paymentExternalRef
    );
    if (!payment || payment.status !== "confirmed") {
      return res.status(409).json({ error: "Payment not confirmed. Asset release blocked." });
    }

    try {
      const transfers = [];
      for (const tokenId of parsed.data.tokenIds) {
        const tx = await services.minter.transfer(parsed.data.fromWallet, parsed.data.toWallet, tokenId);
        services.indexer.upsertListing({
          tokenId,
          owner: parsed.data.toWallet,
          tokenUri:
            [...services.db.listings.values()].find((listing) => listing.tokenId === tokenId)?.tokenUri ??
            "ipfs://unknown",
          status: "transferred"
        });
        const receipt = services.db.createReceipt({
          paymentId: payment.id,
          txHash: tx.txHash,
          wallet: parsed.data.toWallet
        });
        transfers.push({ tokenId, txHash: tx.txHash, receiptId: receipt.id });
      }
      return res.json({ transferred: transfers.length, transfers });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/relist", (req, res) => {
    const schema = z.object({
      tokenId: z.number().int().positive(),
      ownerWallet: z.string().min(4)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const existing = [...services.db.listings.values()].find((listing) => listing.tokenId === parsed.data.tokenId);
    if (!existing) {
      return res.status(404).json({ error: "Token not indexed yet" });
    }

    const listing = services.db.updateListing(existing.id, {
      owner: parsed.data.ownerWallet,
      status: "listed"
    });
    return res.json(listing);
  });

  return router;
}

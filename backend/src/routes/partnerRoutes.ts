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

  function extractBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader) return null;
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) return null;
    return token;
  }

  function trackPartnerCall(
    keyId: string,
    endpoint: string,
    ok: boolean,
    reason?: string
  ): void {
    services.db.appendAuditLog("partner_api_call", "partner", {
      keyId,
      endpoint,
      ok,
      reason
    });
  }

  router.use((req, res, next) => {
    const token = extractBearerToken(req.headers.authorization as string | undefined);
    if (!token) {
      return res.status(401).json({ error: "Missing partner API key" });
    }
    const partnerKey = services.db.findPartnerApiKeyByRawKey(token);
    if (!partnerKey) {
      return res.status(401).json({ error: "Invalid partner API key" });
    }
    res.locals.partnerKeyId = partnerKey.id;
    res.locals.partnerPermissions = partnerKey.permissions;
    services.db.markPartnerApiKeyUsed(partnerKey.id);
    return next();
  });

  router.post("/bulk-purchase", async (req, res, next) => {
    const permissions = (res.locals.partnerPermissions as Array<string> | undefined) ?? [];
    const keyId = String(res.locals.partnerKeyId ?? "");
    if (!permissions.includes("BulkPurchase")) {
      trackPartnerCall(keyId, "/bulk-purchase", false, "missing_permission");
      return res.status(403).json({ error: "API key does not have BulkPurchase permission" });
    }
    const schema = z.object({
      buyerWallet: z.string().min(4),
      amountUsd: z.number().positive(),
      currency: z.string().default("USD"),
      tokenIds: z.array(z.number().int().positive()).min(1)
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      trackPartnerCall(keyId, "/bulk-purchase", false, "validation_error");
      return res.status(400).json({ error: parsed.error.issues });
    }

    let idempotencyKey: string;
    try {
      idempotencyKey = requireIdempotencyKey(req.headers);
    } catch (error) {
      trackPartnerCall(keyId, "/bulk-purchase", false, "invalid_idempotency");
      return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid header" });
    }

    const cached = services.db.idempotency.get(idempotencyKey);
    if (cached) {
      trackPartnerCall(keyId, "/bulk-purchase", true);
      return res.json({ reused: true, paymentId: cached });
    }

    try {
      const paymentResult = await services.payment.createPaymentSession({
        amountUsd: parsed.data.amountUsd,
        currency: parsed.data.currency
      });
      const payment = paymentResult.payment;
      services.db.idempotency.set(idempotencyKey, payment.id);
      services.db.touch();
      trackPartnerCall(keyId, "/bulk-purchase", true);
      return res.status(201).json({
        paymentId: payment.id,
        externalRef: payment.externalRef,
        status: payment.status
      });
    } catch (error) {
      trackPartnerCall(keyId, "/bulk-purchase", false, "internal_error");
      return next(error);
    }
  });

  router.post("/bulk-transfer", async (req, res, next) => {
    const permissions = (res.locals.partnerPermissions as Array<string> | undefined) ?? [];
    const keyId = String(res.locals.partnerKeyId ?? "");
    if (!permissions.includes("Transfer")) {
      trackPartnerCall(keyId, "/bulk-transfer", false, "missing_permission");
      return res.status(403).json({ error: "API key does not have Transfer permission" });
    }
    const schema = z.object({
      paymentExternalRef: z.string().min(5),
      fromWallet: z.string().min(4),
      toWallet: z.string().min(4),
      tokenIds: z.array(z.number().int().positive()).min(1)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      trackPartnerCall(keyId, "/bulk-transfer", false, "validation_error");
      return res.status(400).json({ error: parsed.error.issues });
    }

    const payment = [...services.db.payments.values()].find(
      (item) => item.externalRef === parsed.data.paymentExternalRef
    );
    if (!payment || payment.status !== "confirmed") {
      trackPartnerCall(keyId, "/bulk-transfer", false, "payment_not_confirmed");
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
      trackPartnerCall(keyId, "/bulk-transfer", true);
      return res.json({ transferred: transfers.length, transfers });
    } catch (error) {
      trackPartnerCall(keyId, "/bulk-transfer", false, "internal_error");
      return next(error);
    }
  });

  router.post("/relist", (req, res) => {
    const permissions = (res.locals.partnerPermissions as Array<string> | undefined) ?? [];
    const keyId = String(res.locals.partnerKeyId ?? "");
    if (!permissions.includes("Relist")) {
      trackPartnerCall(keyId, "/relist", false, "missing_permission");
      return res.status(403).json({ error: "API key does not have Relist permission" });
    }
    const schema = z.object({
      tokenId: z.number().int().positive(),
      ownerWallet: z.string().min(4)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      trackPartnerCall(keyId, "/relist", false, "validation_error");
      return res.status(400).json({ error: parsed.error.issues });
    }

    const existing = [...services.db.listings.values()].find((listing) => listing.tokenId === parsed.data.tokenId);
    if (!existing) {
      trackPartnerCall(keyId, "/relist", false, "token_not_indexed");
      return res.status(404).json({ error: "Token not indexed yet" });
    }

    const listing = services.db.updateListing(existing.id, {
      owner: parsed.data.ownerWallet,
      status: "listed"
    });
    trackPartnerCall(keyId, "/relist", true);
    return res.json(listing);
  });

  return router;
}

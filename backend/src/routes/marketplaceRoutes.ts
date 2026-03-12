import { Router } from "express";
import { z } from "zod";
import { config } from "../config";
import { Services } from "../services/serviceContainer";
import { ListingRecord } from "../types";

export function createMarketplaceRoutes(services: Services): Router {
  const router = Router();
  const ipfsGateways = ["https://gateway.pinata.cloud/ipfs/", "https://ipfs.io/ipfs/"];
  const shouldForceHttpsImageUrls = config.nodeEnv === "production";

  function roundUsd(value: number): number {
    return Number(value.toFixed(2));
  }

  function resolveListingPriceUsd(listing: ListingRecord): number {
    const pricing = services.db.pricingConfig;
    const byListing = pricing.listingOverrides[listing.id];
    if (Number.isFinite(byListing) && byListing > 0) return roundUsd(byListing);
    const bySeries = pricing.seriesOverrides[String(listing.seriesId)];
    if (Number.isFinite(bySeries) && bySeries > 0) return roundUsd(bySeries);
    const byTheme = (listing.themes ?? [])
      .map((theme) => pricing.themeOverrides[theme.trim()])
      .find((value) => Number.isFinite(value) && (value as number) > 0);
    if (Number.isFinite(byTheme) && (byTheme as number) > 0) return roundUsd(byTheme as number);
    const stepped = pricing.basePriceUsd + (listing.tokenId % 5) * pricing.tokenStepUsd;
    return roundUsd(Math.max(1, stepped));
  }

  function resolveIpfsUri(uri: string): string {
    const value = uri.trim();
    if (value.startsWith("ipfs://")) {
      const path = value.slice("ipfs://".length).replace(/^\/+/, "");
      return `${ipfsGateways[0]}${path}`;
    }
    return value;
  }

  function normalizeImageUrlForHttps(imageUrl: string): string {
    const value = imageUrl.trim();
    if (!value) return value;
    if (!shouldForceHttpsImageUrls) return value;

    const configuredBase = config.publicBaseUrl.trim();
    let configuredUrl: URL | undefined;
    try {
      configuredUrl = new URL(configuredBase);
    } catch {
      configuredUrl = undefined;
    }

    try {
      const currentUrl = new URL(value);
      if (!configuredUrl) {
        return currentUrl.protocol === "http:"
          ? `https://${value.slice("http://".length)}`
          : value;
      }

      // For generated media, pin host/protocol to the configured public base.
      if (currentUrl.pathname.startsWith("/generated/")) {
        return `${configuredUrl.origin}${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
      }

      // Keep non-generated URLs, but enforce HTTPS when possible.
      if (currentUrl.protocol === "http:") {
        currentUrl.protocol = "https:";
        return currentUrl.toString();
      }
      return currentUrl.toString();
    } catch {
      if (value.startsWith("/generated/") && configuredUrl) {
        return `${configuredUrl.origin}${value}`;
      }
      return value.startsWith("http://") ? `https://${value.slice("http://".length)}` : value;
    }
  }

  async function fetchMetadataImage(tokenUri: string): Promise<string | undefined> {
    const metadataUrl = resolveIpfsUri(tokenUri);
    if (!/^https?:\/\//i.test(metadataUrl)) {
      return undefined;
    }
    for (const gateway of ipfsGateways) {
      const url =
        metadataUrl.startsWith("http://") || metadataUrl.startsWith("https://")
          ? metadataUrl.replace(/^https?:\/\/[^/]+\/ipfs\//i, gateway)
          : metadataUrl;
      try {
        const response = await fetch(url, { method: "GET" });
        if (!response.ok) continue;
        const payload = (await response.json()) as { image?: unknown };
        if (typeof payload.image === "string" && payload.image.trim().length > 0) {
          return resolveIpfsUri(payload.image);
        }
      } catch {
        continue;
      }
    }
    return undefined;
  }

  async function enrichListingImage(listing: ListingRecord): Promise<ListingRecord> {
    if (listing.imageUrl) {
      const normalized = shouldForceHttpsImageUrls
        ? normalizeImageUrlForHttps(listing.imageUrl)
        : listing.imageUrl;
      if (normalized !== listing.imageUrl) {
        return services.db.updateListing(listing.id, { imageUrl: normalized });
      }
      return listing;
    }
    const imageUrl = await fetchMetadataImage(listing.tokenUri);
    if (!imageUrl) return listing;
    return services.db.updateListing(listing.id, { imageUrl });
  }

  router.get("/gateway-info", (_req, res) => {
    const gateway = services.payment.getGatewayConfig();
    const cryptoOnlyProviders = new Set(["nowpayments"]);
    const cryptoOnly = cryptoOnlyProviders.has(gateway.provider);
    return res.json({
      provider: gateway.provider,
      mode: gateway.mode,
      checkoutType: cryptoOnly ? "crypto-only" : "fiat-or-gateway",
      kycRequired: !cryptoOnly,
      twoFARequired: !cryptoOnly
    });
  });

  router.get("/theme-pool", (_req, res) => {
    const maxThemes = Math.max(1, Math.min(10, services.db.adminControls.trendTopicLimit ?? 3));
    const activeThemes = services.trends
      .getThemes()
      .filter((theme) => theme.active)
      .sort((a, b) => a.priority - b.priority)
      .map((theme) => theme.name.trim())
      .filter((theme) => theme.length > 0);
    const listingThemes = Array.from(
      new Set(
        [...services.db.listings.values()]
          .flatMap((listing) => listing.themes)
          .map((theme) => theme.trim())
          .filter((theme) => theme.length > 0)
      )
    );
    const recentTrendTopics = Array.from(
      new Set(
        [...services.db.trends.values()]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((item) => item.topic.trim())
          .filter((topic) => topic.length > 0)
      )
    );
    const mergedThemes = Array.from(new Set([...activeThemes, ...recentTrendTopics, ...listingThemes]));
    const themes = mergedThemes.slice(0, maxThemes);
    const latestTrendAt = [...services.db.trends.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.createdAt;
    return res.json({
      themes,
      maxThemes,
      refreshIntervalHours: Math.max(1, Math.min(168, services.db.adminControls.trendRefreshIntervalHours ?? 24)),
      updatedAt: latestTrendAt ?? new Date().toISOString()
    });
  });

  router.get("/content-pages/:slug", (req, res) => {
    const page = services.db.getCmsPage(req.params.slug);
    if (!page) {
      return res.status(404).json({ error: "Content page not found" });
    }
    return res.json(page);
  });

  router.get("/listings", async (_req, res) => {
    const listings = services.indexer.listAll();
    const withImages = await Promise.all(listings.map((listing) => enrichListingImage(listing)));
    return res.json(withImages.map((listing) => ({ ...listing, priceUsd: resolveListingPriceUsd(listing) })));
  });

  router.get("/listings/:listingId", async (req, res) => {
    const listing = services.db.listings.get(req.params.listingId);
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }
    const withImage = await enrichListingImage(listing);
    return res.json({ ...withImage, priceUsd: resolveListingPriceUsd(withImage) });
  });

  router.get("/ownership/:wallet", async (req, res) => {
    const listings = services.indexer.listByOwner(req.params.wallet);
    const withImages = await Promise.all(listings.map((listing) => enrichListingImage(listing)));
    return res.json(withImages.map((listing) => ({ ...listing, priceUsd: resolveListingPriceUsd(listing) })));
  });

  router.get("/receipts/:wallet", (req, res) => {
    const wallet = req.params.wallet.toLowerCase();
    const receipts = [...services.db.receipts.values()]
      .filter((receipt) => receipt.wallet.toLowerCase() === wallet)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((receipt) => {
        const payment = services.db.payments.get(receipt.paymentId);
        const session = services.db.paymentSessions.get(receipt.paymentId);
        return {
          id: receipt.id,
          paymentId: receipt.paymentId,
          listingId: session?.listingId,
          txHash: receipt.txHash,
          wallet: receipt.wallet,
          amountUsd: payment?.amountUsd,
          currency: payment?.currency,
          paymentStatus: payment?.status,
          settlementStatus: session?.settlementStatus,
          gatewayProvider: services.db.gatewaySettings.provider,
          createdAt: receipt.createdAt
        };
      });
    return res.json(receipts);
  });

  router.post("/purchase-session", async (req, res, next) => {
    const schema = z.object({
      listingId: z.string().min(5).optional(),
      tokenId: z.number().int().positive().optional(),
      buyerAddress: z.string().min(4),
      idempotencyKey: z.string().min(8),
      amountUsd: z.number().positive(),
      currency: z.string().default("USD")
    }).refine((value) => Boolean(value.listingId || value.tokenId), {
      message: "Either listingId or tokenId is required",
      path: ["listingId"]
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const existingSession = services.db.findPaymentSessionByIdempotencyKey(parsed.data.idempotencyKey);
    if (existingSession) {
      const existingPayment = services.db.payments.get(existingSession.paymentId);
      if (!existingPayment) {
        return res.status(500).json({ error: "Found stale payment session state" });
      }
      return res.json({
        reused: true,
        paymentId: existingPayment.id,
        externalRef: existingPayment.externalRef,
        paymentStatus: existingPayment.status,
        settlementStatus: existingSession.settlementStatus,
        checkoutUrl: existingSession.checkoutUrl,
        listingId: existingSession.listingId,
        tokenId: existingSession.tokenId,
        amountUsd: existingSession.amountUsd,
        currency: existingSession.currency,
        txHash: existingSession.txHash,
        receiptId: existingSession.receiptId
      });
    }

    const listing =
      parsed.data.listingId
        ? services.db.listings.get(parsed.data.listingId)
        : [...services.db.listings.values()].find((item) => item.tokenId === parsed.data.tokenId);

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    const gateway = services.payment.getGatewayConfig();
    if (gateway.mode === "sandbox" || gateway.provider === "mock") {
      return res.status(409).json({
        error:
          "Real checkout is not configured. Set gateway mode to live and choose a non-mock provider in Admin Settings."
      });
    }

    try {
      const pricedAmountUsd = resolveListingPriceUsd(listing);
      const paymentResult = await services.payment.createPaymentSession({
        ...parsed.data,
        amountUsd: pricedAmountUsd
      });
      const payment = paymentResult.payment;
      if (!paymentResult.checkoutUrl) {
        return res.status(502).json({
          error: "Payment provider did not return a checkout URL. Check gateway adapter configuration."
        });
      }
      const session = services.db.createPaymentSession({
        paymentId: payment.id,
        listingId: listing.id,
        tokenId: listing.tokenId,
        sellerAddress: listing.owner,
        buyerAddress: parsed.data.buyerAddress,
        amountUsd: pricedAmountUsd,
        currency: parsed.data.currency,
        idempotencyKey: parsed.data.idempotencyKey,
        checkoutUrl: paymentResult.checkoutUrl,
        settlementStatus: "pending"
      });
      services.db.idempotency.set(parsed.data.idempotencyKey, payment.id);
      services.db.touch();
      return res.status(201).json({
        paymentId: payment.id,
        externalRef: payment.externalRef,
        paymentStatus: payment.status,
        settlementStatus: session.settlementStatus,
        checkoutUrl: session.checkoutUrl,
        listingId: session.listingId,
        tokenId: session.tokenId,
        amountUsd: session.amountUsd,
        currency: session.currency
      });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/purchase-session/:paymentId", (req, res) => {
    let payment = services.db.payments.get(req.params.paymentId);
    const session = services.db.paymentSessions.get(req.params.paymentId);
    if (!payment || !session) {
      return res.status(404).json({ error: "Purchase session not found" });
    }

    // In sandbox mode, auto-progress payments to confirmed so the
    // end-to-end flow can be validated without external gateway callbacks.
    const ageMs = Date.now() - new Date(payment.createdAt).getTime();
    const gateway = services.payment.getGatewayConfig();
    if ((gateway.mode === "sandbox" || gateway.provider === "mock") && ageMs > 5000 && payment.status !== "confirmed") {
      payment = services.db.updatePayment(payment.id, { status: "confirmed" });
    }

    const listing = services.db.listings.get(session.listingId);
    return res.json({
      paymentId: payment.id,
      externalRef: payment.externalRef,
      paymentStatus: payment.status,
      settlementStatus: session.settlementStatus,
      checkoutUrl: session.checkoutUrl,
      listingId: session.listingId,
      tokenId: session.tokenId,
      buyerAddress: session.buyerAddress,
      sellerAddress: session.sellerAddress,
      amountUsd: session.amountUsd,
      currency: session.currency,
      txHash: session.txHash,
      receiptId: session.receiptId,
      owner: listing?.owner ?? session.sellerAddress
    });
  });

  router.post("/purchase-session/:paymentId/settle", async (req, res, next) => {
    const payment = services.db.payments.get(req.params.paymentId);
    const session = services.db.paymentSessions.get(req.params.paymentId);
    if (!payment || !session) {
      return res.status(404).json({ error: "Purchase session not found" });
    }

    if (session.settlementStatus === "completed" && session.txHash) {
      return res.json({
        paymentId: payment.id,
        settlementStatus: session.settlementStatus,
        txHash: session.txHash,
        receiptId: session.receiptId
      });
    }

    if (payment.status !== "confirmed") {
      return res.status(409).json({ error: "Payment is not confirmed yet" });
    }

    try {
      services.db.updatePaymentSession(payment.id, { settlementStatus: "processing", error: undefined });

      const transfer = await services.minter.transfer(session.sellerAddress, session.buyerAddress, session.tokenId);
      services.indexer.upsertListing({
        tokenId: session.tokenId,
        owner: session.buyerAddress,
        tokenUri: services.db.listings.get(session.listingId)?.tokenUri ?? "ipfs://unknown",
        status: "transferred"
      });

      const receipt = services.db.createReceipt({
        paymentId: payment.id,
        txHash: transfer.txHash,
        wallet: session.buyerAddress
      });

      const updated = services.db.updatePaymentSession(payment.id, {
        settlementStatus: "completed",
        txHash: transfer.txHash,
        receiptId: receipt.id
      });

      return res.json({
        paymentId: payment.id,
        settlementStatus: updated.settlementStatus,
        txHash: updated.txHash,
        receiptId: updated.receiptId
      });
    } catch (error) {
      services.db.updatePaymentSession(payment.id, {
        settlementStatus: "failed",
        error: error instanceof Error ? error.message : "Settlement failed"
      });
      return next(error);
    }
  });

  return router;
}

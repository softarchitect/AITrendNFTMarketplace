import { createHash, randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { config } from "../config";
import { logger } from "../logger";
import { hashPassword } from "../security/password";
import {
  GeneratedAsset,
  GenerationJob,
  ListingRecord,
  MintRecord,
  PaymentRecord,
  ReceiptRecord,
  TrendTopic
} from "../types";

interface MintCounters {
  date: string;
  perDay: number;
  perHour: Record<string, number>;
}

type TrendSourceStatus = "Active" | "Paused";
type TrendSourceRateLimitMode = "Standard" | "Aggressive" | "Conservative";
const DEFAULT_TREND_SOURCE_CATALOG = ["twitter", "instagram", "reddit"] as const;
const DEFAULT_ADMIN_TRENDING_THEMES = ["AI Art", "Future Cities", "Cultural Fusion"] as const;

export type AdminThemeType = "Trending" | "Pinned";

export interface AdminThemeRecord {
  id: string;
  name: string;
  type: AdminThemeType;
  description: string;
  active: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSessionRecord {
  paymentId: string;
  listingId: string;
  tokenId: number;
  buyerAddress: string;
  sellerAddress: string;
  amountUsd: number;
  currency: string;
  idempotencyKey: string;
  checkoutUrl?: string;
  settlementStatus: "pending" | "processing" | "completed" | "failed";
  txHash?: string;
  receiptId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSessionRecord {
  token: string;
  userId: string;
  email: string;
  displayName: string;
  role: "Admin";
  expiresAt: string;
  createdAt: string;
}

export interface AdminUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: "Admin";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: "User";
  kycStatus: "NotStarted" | "Pending" | "Verified" | "Rejected";
  twoFAEnabled: boolean;
  walletAddresses: string[];
  notificationPreferences: {
    newDrops: boolean;
    purchaseConfirmations: boolean;
    transferUpdates: boolean;
    platformAnnouncements: boolean;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserSessionRecord {
  token: string;
  userId: string;
  email: string;
  displayName: string;
  role: "User";
  expiresAt: string;
  createdAt: string;
}

export interface AdminControlsRecord {
  dailyCap: number;
  hourlyCap: number;
  pipelineEnabled: boolean;
  scheduleEnabled: boolean;
  trendTopicLimit: number;
  trendRefreshIntervalHours: number;
  autoMintIntervalMinutes: number;
  autoMintBatchSize: number;
  dailyMinimumTarget: number;
}

export interface GatewaySettingsRecord {
  provider: "mock" | "generic" | "vellis" | "wert" | "nowpayments";
  mode: "sandbox" | "live";
  webhookVerificationEnabled: boolean;
  webhookSignatureHeader: string;
}

export interface PricingConfigRecord {
  basePriceUsd: number;
  tokenStepUsd: number;
  themeOverrides: Record<string, number>;
  seriesOverrides: Record<string, number>;
  listingOverrides: Record<string, number>;
}

export interface SeriesLifecycleConfigRecord {
  autoSeriesEnabled: boolean;
  seriesIdTemplate: string;
  defaultSeriesMaxSupply: number;
  seriesMetadataRootTemplate: string;
}

export interface WebhookEventRecord {
  id: string;
  kind: "payment";
  externalRef?: string;
  status: "accepted" | "rejected";
  reason?: string;
  createdAt: string;
}

export interface PartnerApiKeyRecord {
  id: string;
  label: string;
  keyPrefix: string;
  keyHash?: string;
  createdAt: string;
  lastUsedAt: string;
  permissions: Array<"BulkPurchase" | "Transfer" | "Relist">;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  actor: string;
  createdAt: string;
  details: Record<string, unknown>;
}

export interface CmsPageRecord {
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
  updatedBy: string;
}

interface StoreSnapshot {
  trends: TrendTopic[];
  jobs: GenerationJob[];
  assets: GeneratedAsset[];
  mints: MintRecord[];
  listings: ListingRecord[];
  payments: PaymentRecord[];
  receipts: ReceiptRecord[];
  paymentSessions: PaymentSessionRecord[];
  adminUsers: AdminUserRecord[];
  adminSessions: AdminSessionRecord[];
  users: UserRecord[];
  userSessions: UserSessionRecord[];
  webhookEvents: WebhookEventRecord[];
  idempotency: Array<[string, string]>;
  themes: AdminThemeRecord[];
  pinnedThemes: string[];
  trendSources: string[];
  trendSourceStatuses: Array<[string, TrendSourceStatus]>;
  trendSourceRateLimitModes: Array<[string, TrendSourceRateLimitMode]>;
  mintCounters: MintCounters;
  adminControls: AdminControlsRecord;
  gatewaySettings: GatewaySettingsRecord;
  pricingConfig: PricingConfigRecord;
  seriesLifecycleConfig: SeriesLifecycleConfigRecord;
  defaultEditionSize: number;
  editionOverrides: Array<[string, number]>;
  partnerApiKeys: PartnerApiKeyRecord[];
  auditLogs: AuditLogRecord[];
  cmsPages: CmsPageRecord[];
}

function createDefaultThemeRecords(): AdminThemeRecord[] {
  const now = new Date().toISOString();
  return DEFAULT_ADMIN_TRENDING_THEMES.map((name, index) => ({
    id: `theme-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
    type: "Trending" as const,
    description: "Auto-suggested trending theme",
    active: true,
    priority: index + 1,
    createdAt: now,
    updatedAt: now
  }));
}

function createDefaultCmsPages(): CmsPageRecord[] {
  const now = new Date().toISOString();
  return [
    {
      slug: "faq",
      title: "Frequently Asked Questions",
      content: [
        "Q: What is Affordable NFT?",
        "A: Affordable NFT is an AI-powered NFT marketplace that mints trend-inspired artwork.",
        "",
        "Q: How do purchases work?",
        "A: Purchase flow is payment session -> payment confirmation -> on-chain transfer -> receipt.",
        "",
        "Q: Which wallet do I need?",
        "A: Any EVM wallet compatible with WalletConnect or MetaMask works."
      ].join("\n"),
      updatedAt: now,
      updatedBy: "system"
    },
    {
      slug: "terms",
      title: "Terms of Service",
      content: [
        "By using Affordable NFT, you agree to these terms.",
        "",
        "All blockchain transactions are final once confirmed on-chain.",
        "",
        "Users are responsible for account and wallet security."
      ].join("\n"),
      updatedAt: now,
      updatedBy: "system"
    },
    {
      slug: "privacy",
      title: "Privacy Policy",
      content: [
        "We collect account and usage data needed to operate the platform.",
        "",
        "We do not sell personal data to third parties.",
        "",
        "For privacy requests, contact privacy@affordablenft.com."
      ].join("\n"),
      updatedAt: now,
      updatedBy: "system"
    },
    {
      slug: "contact",
      title: "Contact",
      content: [
        "General inquiries: support@affordablenft.com",
        "Partnerships: partners@affordablenft.com",
        "Security: security@affordablenft.com"
      ].join("\n"),
      updatedAt: now,
      updatedBy: "system"
    },
    {
      slug: "policy",
      title: "Platform Policy",
      content: [
        "Affordable NFT enforces fair usage, anti-abuse, and content safety controls.",
        "",
        "Users must comply with applicable laws and platform rules when using the marketplace.",
        "",
        "Violation of policy may result in account restriction or suspension."
      ].join("\n"),
      updatedAt: now,
      updatedBy: "system"
    }
  ];
}

function sanitizePricingMap(
  source: Record<string, unknown> | undefined,
  keyNormalizer: (key: string) => string | undefined
): Record<string, number> {
  const output: Record<string, number> = {};
  for (const [rawKey, rawValue] of Object.entries(source ?? {})) {
    const normalizedKey = keyNormalizer(rawKey);
    const numericValue = Number(rawValue);
    if (!normalizedKey || !Number.isFinite(numericValue) || numericValue <= 0) continue;
    output[normalizedKey] = numericValue;
  }
  return output;
}

export class InMemoryStore {
  public readonly trends = new Map<string, TrendTopic>();
  public readonly jobs = new Map<string, GenerationJob>();
  public readonly assets = new Map<string, GeneratedAsset>();
  public readonly mints = new Map<string, MintRecord>();
  public readonly listings = new Map<string, ListingRecord>();
  public readonly payments = new Map<string, PaymentRecord>();
  public readonly receipts = new Map<string, ReceiptRecord>();
  public readonly paymentSessions = new Map<string, PaymentSessionRecord>();
  public readonly adminUsers = new Map<string, AdminUserRecord>();
  public readonly adminSessions = new Map<string, AdminSessionRecord>();
  public readonly users = new Map<string, UserRecord>();
  public readonly userSessions = new Map<string, UserSessionRecord>();
  public readonly webhookEvents = new Map<string, WebhookEventRecord>();
  public readonly idempotency = new Map<string, string>();
  public readonly themes = new Map<string, AdminThemeRecord>(
    createDefaultThemeRecords().map((theme) => [theme.id, theme])
  );
  public readonly pinnedThemes = new Set<string>();
  public readonly trendSources = new Set<string>(DEFAULT_TREND_SOURCE_CATALOG);
  public readonly trendSourceStatuses = new Map<string, TrendSourceStatus>([
    ["twitter", "Active"],
    ["instagram", "Active"],
    ["reddit", "Active"]
  ]);
  public readonly trendSourceRateLimitModes = new Map<string, TrendSourceRateLimitMode>([
    ["twitter", "Standard"],
    ["instagram", "Standard"],
    ["reddit", "Standard"]
  ]);
  public defaultEditionSize = config.defaultEditionSize;
  public readonly editionOverrides = new Map<string, number>();
  public readonly partnerApiKeys = new Map<string, PartnerApiKeyRecord>();
  public auditLogs: AuditLogRecord[] = [];
  public readonly cmsPages = new Map<string, CmsPageRecord>(
    createDefaultCmsPages().map((page) => [page.slug, page])
  );
  public adminControls: AdminControlsRecord = {
    dailyCap: 50,
    hourlyCap: 10,
    pipelineEnabled: true,
    scheduleEnabled: true,
    trendTopicLimit: 3,
    trendRefreshIntervalHours: 24,
    autoMintIntervalMinutes: 15,
    autoMintBatchSize: 1,
    dailyMinimumTarget: 0
  };
  public gatewaySettings: GatewaySettingsRecord = {
    provider: config.payment.provider,
    mode: config.features.mockPayment || config.payment.provider === "mock" ? "sandbox" : "live",
    webhookVerificationEnabled: Boolean(config.payment.webhookSecret),
    webhookSignatureHeader: config.payment.webhookSignatureHeader
  };
  public pricingConfig: PricingConfigRecord = {
    basePriceUsd: 100,
    tokenStepUsd: 15,
    themeOverrides: {},
    seriesOverrides: {},
    listingOverrides: {}
  };
  public seriesLifecycleConfig: SeriesLifecycleConfigRecord = {
    autoSeriesEnabled: false,
    seriesIdTemplate: "next",
    defaultSeriesMaxSupply: config.defaultEditionSize,
    seriesMetadataRootTemplate: ""
  };
  public mintCounters: MintCounters = {
    date: new Date().toISOString().slice(0, 10),
    perDay: 0,
    perHour: {}
  };
  private onMutate?: () => void;

  setMutationHook(hook?: () => void): void {
    this.onMutate = hook;
  }

  touch(): void {
    this.onMutate?.();
  }

  hydrate(snapshot: Partial<StoreSnapshot>): void {
    this.trends.clear();
    for (const item of snapshot.trends ?? []) this.trends.set(item.id, item);
    this.jobs.clear();
    for (const item of snapshot.jobs ?? []) this.jobs.set(item.id, item);
    this.assets.clear();
    for (const item of snapshot.assets ?? []) this.assets.set(item.id, item);
    this.mints.clear();
    for (const item of snapshot.mints ?? []) this.mints.set(item.id, item);
    this.listings.clear();
    for (const item of snapshot.listings ?? []) {
      this.listings.set(item.id, {
        ...item,
        seriesId: item.seriesId ?? config.defaultSeriesId,
        editionSize: item.editionSize ?? 1,
        editionNumber: item.editionNumber ?? 1,
        editionAvailable: item.editionAvailable ?? 1,
        themes: item.themes ?? []
      });
    }
    this.payments.clear();
    for (const item of snapshot.payments ?? []) this.payments.set(item.id, item);
    this.receipts.clear();
    for (const item of snapshot.receipts ?? []) this.receipts.set(item.id, item);
    this.paymentSessions.clear();
    for (const item of snapshot.paymentSessions ?? []) this.paymentSessions.set(item.paymentId, item);
    this.adminUsers.clear();
    for (const item of snapshot.adminUsers ?? []) this.adminUsers.set(item.id, item);
    this.adminSessions.clear();
    for (const item of snapshot.adminSessions ?? []) this.adminSessions.set(item.token, item);
    this.users.clear();
    for (const item of snapshot.users ?? []) {
      this.users.set(item.id, {
        ...item,
        kycStatus: item.kycStatus ?? "Verified",
        twoFAEnabled: item.twoFAEnabled ?? false,
        walletAddresses: Array.isArray(item.walletAddresses) ? item.walletAddresses : [],
        notificationPreferences: {
          newDrops: item.notificationPreferences?.newDrops ?? true,
          purchaseConfirmations: item.notificationPreferences?.purchaseConfirmations ?? true,
          transferUpdates: item.notificationPreferences?.transferUpdates ?? true,
          platformAnnouncements: item.notificationPreferences?.platformAnnouncements ?? true
        }
      });
    }
    this.userSessions.clear();
    for (const item of snapshot.userSessions ?? []) this.userSessions.set(item.token, item);
    this.webhookEvents.clear();
    for (const item of snapshot.webhookEvents ?? []) this.webhookEvents.set(item.id, item);
    this.idempotency.clear();
    for (const [key, value] of snapshot.idempotency ?? []) this.idempotency.set(key, value);
    this.themes.clear();
    for (const item of snapshot.themes ?? []) this.themes.set(item.id, item);
    this.pinnedThemes.clear();
    for (const item of snapshot.pinnedThemes ?? []) this.pinnedThemes.add(item);
    if (this.themes.size === 0) {
      if (this.pinnedThemes.size > 0) {
        const now = new Date().toISOString();
        let priority = 1;
        for (const name of this.pinnedThemes) {
          const normalized = name.trim();
          if (!normalized) continue;
          this.themes.set(`theme-${normalized.toLowerCase().replace(/\s+/g, "-")}`, {
            id: `theme-${normalized.toLowerCase().replace(/\s+/g, "-")}`,
            name: normalized,
            type: "Pinned",
            description: "Pinned by admin",
            active: true,
            priority,
            createdAt: now,
            updatedAt: now
          });
          priority += 1;
        }
      } else {
        for (const theme of createDefaultThemeRecords()) {
          this.themes.set(theme.id, theme);
        }
      }
    }
    this.syncPinnedThemesFromThemeRecords();
    this.trendSources.clear();
    this.trendSourceStatuses.clear();
    this.trendSourceRateLimitModes.clear();
    const sourceStatuses = snapshot.trendSourceStatuses ?? [];
    const hasAnyStoredSources =
      sourceStatuses.length > 0 || (snapshot.trendSources?.length ?? 0) > 0;
    const activeSeedSources = hasAnyStoredSources
      ? (snapshot.trendSources ?? [])
      : [...DEFAULT_TREND_SOURCE_CATALOG];
    const activeSources = new Set(activeSeedSources.map((item) => item.toLowerCase()));
    if (snapshot.trendSourceStatuses && snapshot.trendSourceStatuses.length > 0) {
      for (const [source, status] of snapshot.trendSourceStatuses) {
        const normalized = source.toLowerCase();
        this.trendSourceStatuses.set(normalized, status);
      }
    } else {
      for (const source of DEFAULT_TREND_SOURCE_CATALOG) {
        this.trendSourceStatuses.set(source, activeSources.has(source) ? "Active" : "Paused");
      }
      for (const source of activeSources) {
        this.trendSourceStatuses.set(source, "Active");
      }
    }
    // Always retain default catalog entries so disabled sources remain visible after restart.
    for (const source of DEFAULT_TREND_SOURCE_CATALOG) {
      if (!this.trendSourceStatuses.has(source)) {
        this.trendSourceStatuses.set(source, activeSources.has(source) ? "Active" : "Paused");
      }
    }
    if (snapshot.trendSourceRateLimitModes && snapshot.trendSourceRateLimitModes.length > 0) {
      for (const [source, mode] of snapshot.trendSourceRateLimitModes) {
        const normalized = source.toLowerCase();
        this.trendSourceRateLimitModes.set(normalized, mode);
      }
    }
    for (const source of this.trendSourceStatuses.keys()) {
      if (!this.trendSourceRateLimitModes.has(source)) {
        this.trendSourceRateLimitModes.set(source, "Standard");
      }
    }
    for (const [source, status] of this.trendSourceStatuses.entries()) {
      if (status === "Active") {
        this.trendSources.add(source);
      }
    }
    if (snapshot.mintCounters) {
      this.mintCounters = snapshot.mintCounters;
    }
    if (snapshot.adminControls) {
      this.adminControls = {
        ...snapshot.adminControls,
        trendTopicLimit: Math.max(1, Math.min(10, snapshot.adminControls.trendTopicLimit ?? 3)),
        trendRefreshIntervalHours: Math.max(
          1,
          Math.min(168, snapshot.adminControls.trendRefreshIntervalHours ?? 24)
        ),
        autoMintIntervalMinutes: Math.max(1, snapshot.adminControls.autoMintIntervalMinutes ?? 15),
        autoMintBatchSize: Math.max(1, Math.min(10, snapshot.adminControls.autoMintBatchSize ?? 1)),
        dailyMinimumTarget: Math.max(0, snapshot.adminControls.dailyMinimumTarget ?? 0)
      };
    }
    if (snapshot.gatewaySettings) {
      this.gatewaySettings = {
        provider: snapshot.gatewaySettings.provider,
        mode: snapshot.gatewaySettings.mode,
        webhookVerificationEnabled: snapshot.gatewaySettings.webhookVerificationEnabled,
        webhookSignatureHeader: snapshot.gatewaySettings.webhookSignatureHeader
      };
    }
    if (snapshot.pricingConfig) {
      this.pricingConfig = {
        basePriceUsd: Math.max(1, Number(snapshot.pricingConfig.basePriceUsd ?? 100)),
        tokenStepUsd: Math.max(0, Number(snapshot.pricingConfig.tokenStepUsd ?? 15)),
        themeOverrides: sanitizePricingMap(snapshot.pricingConfig.themeOverrides, (key) => {
          const normalized = key.trim();
          return normalized.length > 0 ? normalized : undefined;
        }),
        seriesOverrides: sanitizePricingMap(snapshot.pricingConfig.seriesOverrides, (key) => {
          const numeric = Number(key);
          return numeric > 0 ? String(numeric) : undefined;
        }),
        listingOverrides: sanitizePricingMap(snapshot.pricingConfig.listingOverrides, (key) => {
          const normalized = key.trim();
          return normalized.length > 0 ? normalized : undefined;
        })
      };
    }
    if (snapshot.seriesLifecycleConfig) {
      const template = snapshot.seriesLifecycleConfig.seriesIdTemplate?.trim() || "next";
      const metadataTemplate = snapshot.seriesLifecycleConfig.seriesMetadataRootTemplate?.trim() || "";
      this.seriesLifecycleConfig = {
        autoSeriesEnabled: Boolean(snapshot.seriesLifecycleConfig.autoSeriesEnabled),
        seriesIdTemplate: template,
        defaultSeriesMaxSupply: Math.max(
          1,
          Number(snapshot.seriesLifecycleConfig.defaultSeriesMaxSupply ?? config.defaultEditionSize)
        ),
        seriesMetadataRootTemplate: metadataTemplate
      };
    }
    if (typeof snapshot.defaultEditionSize === "number") {
      this.defaultEditionSize = snapshot.defaultEditionSize;
    }
    this.backfillListingImagesFromAssets();
    this.editionOverrides.clear();
    for (const [key, value] of snapshot.editionOverrides ?? []) this.editionOverrides.set(key, value);
    this.partnerApiKeys.clear();
    for (const item of snapshot.partnerApiKeys ?? []) this.partnerApiKeys.set(item.id, item);
    this.auditLogs = snapshot.auditLogs ?? [];
    this.cmsPages.clear();
    for (const page of snapshot.cmsPages ?? []) {
      this.cmsPages.set(page.slug, page);
    }
    for (const page of createDefaultCmsPages()) {
      if (!this.cmsPages.has(page.slug)) {
        this.cmsPages.set(page.slug, page);
      }
    }
  }

  toSnapshot(): StoreSnapshot {
    return {
      trends: [...this.trends.values()],
      jobs: [...this.jobs.values()],
      assets: [...this.assets.values()],
      mints: [...this.mints.values()],
      listings: [...this.listings.values()],
      payments: [...this.payments.values()],
      receipts: [...this.receipts.values()],
      paymentSessions: [...this.paymentSessions.values()],
      adminUsers: [...this.adminUsers.values()],
      adminSessions: [...this.adminSessions.values()],
      users: [...this.users.values()],
      userSessions: [...this.userSessions.values()],
      webhookEvents: [...this.webhookEvents.values()],
      idempotency: [...this.idempotency.entries()],
      themes: [...this.themes.values()],
      pinnedThemes: [...this.pinnedThemes.values()],
      trendSources: [...this.trendSources.values()],
      trendSourceStatuses: [...this.trendSourceStatuses.entries()],
      trendSourceRateLimitModes: [...this.trendSourceRateLimitModes.entries()],
      mintCounters: this.mintCounters,
      adminControls: this.adminControls,
      gatewaySettings: this.gatewaySettings,
      pricingConfig: this.pricingConfig,
      seriesLifecycleConfig: this.seriesLifecycleConfig,
      defaultEditionSize: this.defaultEditionSize,
      editionOverrides: [...this.editionOverrides.entries()],
      partnerApiKeys: [...this.partnerApiKeys.values()],
      auditLogs: this.auditLogs,
      cmsPages: [...this.cmsPages.values()]
    };
  }

  private backfillListingImagesFromAssets(): void {
    if (this.assets.size === 0 || this.listings.size === 0) return;
    const updates: Array<{ id: string; imageUrl: string }> = [];
    for (const listing of this.listings.values()) {
      if (listing.imageUrl || !listing.tokenUri.startsWith("ipfs://")) continue;
      const cid = listing.tokenUri.slice("ipfs://".length);
      if (!cid) continue;
      for (const asset of this.assets.values()) {
        const candidateCid = createHash("sha256")
          .update(
            JSON.stringify({
              name: `TrendMint: ${asset.topic}`,
              description: `Auto-generated from social trend topic: ${asset.topic}`,
              image: asset.mediaUrl,
              attributes: [
                { trait_type: "topic", value: asset.topic },
                { trait_type: "provider", value: asset.provider },
                { trait_type: "edition_size", value: this.defaultEditionSize }
              ]
            })
          )
          .digest("hex")
          .slice(0, 46);
        if (`bafy${candidateCid}` === cid) {
          updates.push({ id: listing.id, imageUrl: asset.mediaUrl });
          break;
        }
      }
    }
    for (const update of updates) {
      const current = this.listings.get(update.id);
      if (!current) continue;
      this.listings.set(update.id, { ...current, imageUrl: update.imageUrl });
    }
  }

  createTrend(input: Omit<TrendTopic, "id" | "createdAt">): TrendTopic {
    const trend: TrendTopic = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString()
    };
    this.trends.set(trend.id, trend);
    this.touch();
    return trend;
  }

  createJob(topicId: string, prompt: string): GenerationJob {
    const now = new Date().toISOString();
    const job: GenerationJob = {
      id: randomUUID(),
      topicId,
      prompt,
      status: "queued",
      createdAt: now,
      updatedAt: now
    };
    this.jobs.set(job.id, job);
    this.touch();
    return job;
  }

  updateJob(jobId: string, patch: Partial<GenerationJob>): GenerationJob {
    const current = this.jobs.get(jobId);
    if (!current) {
      throw new Error(`Job ${jobId} not found`);
    }
    const next: GenerationJob = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this.jobs.set(jobId, next);
    this.touch();
    return next;
  }

  createAsset(asset: Omit<GeneratedAsset, "id" | "createdAt">): GeneratedAsset {
    const next: GeneratedAsset = {
      ...asset,
      id: randomUUID(),
      createdAt: new Date().toISOString()
    };
    this.assets.set(next.id, next);
    this.touch();
    return next;
  }

  createMint(record: Omit<MintRecord, "id" | "createdAt" | "updatedAt">): MintRecord {
    const now = new Date().toISOString();
    const mint: MintRecord = {
      ...record,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    this.mints.set(mint.id, mint);
    this.touch();
    return mint;
  }

  updateMint(mintId: string, patch: Partial<MintRecord>): MintRecord {
    const current = this.mints.get(mintId);
    if (!current) {
      throw new Error(`Mint ${mintId} not found`);
    }
    const next: MintRecord = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this.mints.set(mintId, next);
    this.touch();
    return next;
  }

  createListing(input: Omit<ListingRecord, "id" | "createdAt" | "updatedAt">): ListingRecord {
    const now = new Date().toISOString();
    const listing: ListingRecord = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    this.listings.set(listing.id, listing);
    this.touch();
    return listing;
  }

  updateListing(listingId: string, patch: Partial<ListingRecord>): ListingRecord {
    const current = this.listings.get(listingId);
    if (!current) {
      throw new Error(`Listing ${listingId} not found`);
    }
    const next: ListingRecord = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this.listings.set(listingId, next);
    this.touch();
    return next;
  }

  createPayment(input: Omit<PaymentRecord, "id" | "createdAt" | "updatedAt">): PaymentRecord {
    const now = new Date().toISOString();
    const payment: PaymentRecord = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    this.payments.set(payment.id, payment);
    this.touch();
    return payment;
  }

  updatePayment(paymentId: string, patch: Partial<PaymentRecord>): PaymentRecord {
    const current = this.payments.get(paymentId);
    if (!current) {
      throw new Error(`Payment ${paymentId} not found`);
    }
    const next: PaymentRecord = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this.payments.set(paymentId, next);
    this.touch();
    return next;
  }

  createReceipt(input: Omit<ReceiptRecord, "id" | "createdAt">): ReceiptRecord {
    const receipt: ReceiptRecord = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString()
    };
    this.receipts.set(receipt.id, receipt);
    this.touch();
    return receipt;
  }

  createPaymentSession(input: Omit<PaymentSessionRecord, "createdAt" | "updatedAt">): PaymentSessionRecord {
    const now = new Date().toISOString();
    const session: PaymentSessionRecord = {
      ...input,
      createdAt: now,
      updatedAt: now
    };
    this.paymentSessions.set(session.paymentId, session);
    this.touch();
    return session;
  }

  updatePaymentSession(paymentId: string, patch: Partial<PaymentSessionRecord>): PaymentSessionRecord {
    const current = this.paymentSessions.get(paymentId);
    if (!current) {
      throw new Error(`Payment session ${paymentId} not found`);
    }
    const next: PaymentSessionRecord = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this.paymentSessions.set(paymentId, next);
    this.touch();
    return next;
  }

  findPaymentSessionByIdempotencyKey(idempotencyKey: string): PaymentSessionRecord | undefined {
    return [...this.paymentSessions.values()].find((session) => session.idempotencyKey === idempotencyKey);
  }

  createAdminSession(input: Omit<AdminSessionRecord, "createdAt">): AdminSessionRecord {
    const session: AdminSessionRecord = {
      ...input,
      createdAt: new Date().toISOString()
    };
    this.adminSessions.set(session.token, session);
    this.touch();
    return session;
  }

  findAdminUserByEmail(email: string): AdminUserRecord | undefined {
    const normalized = email.trim().toLowerCase();
    return [...this.adminUsers.values()].find((user) => user.email.toLowerCase() === normalized);
  }

  upsertAdminUser(input: Omit<AdminUserRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }): AdminUserRecord {
    const existingById = input.id ? this.adminUsers.get(input.id) : undefined;
    const existingByEmail = this.findAdminUserByEmail(input.email);
    const existing = existingById ?? existingByEmail;
    const now = new Date().toISOString();
    const user: AdminUserRecord = existing
      ? {
          ...existing,
          ...input,
          email: input.email.toLowerCase(),
          updatedAt: now
        }
      : {
          id: input.id ?? randomUUID(),
          email: input.email.toLowerCase(),
          passwordHash: input.passwordHash,
          displayName: input.displayName,
          role: "Admin",
          isActive: input.isActive,
          createdAt: now,
          updatedAt: now,
          lastLoginAt: input.lastLoginAt
        };
    this.adminUsers.set(user.id, user);
    this.touch();
    return user;
  }

  updateAdminUser(userId: string, patch: Partial<Omit<AdminUserRecord, "id" | "createdAt">>): AdminUserRecord {
    const current = this.adminUsers.get(userId);
    if (!current) {
      throw new Error(`Admin user ${userId} not found`);
    }
    const next: AdminUserRecord = {
      ...current,
      ...patch,
      email: (patch.email ?? current.email).toLowerCase(),
      updatedAt: new Date().toISOString()
    };
    this.adminUsers.set(userId, next);
    this.touch();
    return next;
  }

  markAdminLogin(userId: string): void {
    const user = this.adminUsers.get(userId);
    if (!user) return;
    this.adminUsers.set(userId, {
      ...user,
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    this.touch();
  }

  removeAdminSession(token: string): void {
    this.adminSessions.delete(token);
    this.touch();
  }

  getAdminSession(token: string): AdminSessionRecord | undefined {
    const session = this.adminSessions.get(token);
    if (!session) return undefined;
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      this.adminSessions.delete(token);
      this.touch();
      return undefined;
    }
    return session;
  }

  createUserSession(input: Omit<UserSessionRecord, "createdAt">): UserSessionRecord {
    const session: UserSessionRecord = {
      ...input,
      createdAt: new Date().toISOString()
    };
    this.userSessions.set(session.token, session);
    this.touch();
    return session;
  }

  findUserByEmail(email: string): UserRecord | undefined {
    const normalized = email.trim().toLowerCase();
    return [...this.users.values()].find((user) => user.email.toLowerCase() === normalized);
  }

  upsertUser(
    input: Omit<UserRecord, "id" | "createdAt" | "updatedAt" | "walletAddresses" | "notificationPreferences"> & {
      id?: string;
      walletAddresses?: string[];
      notificationPreferences?: UserRecord["notificationPreferences"];
    }
  ): UserRecord {
    const existingById = input.id ? this.users.get(input.id) : undefined;
    const existingByEmail = this.findUserByEmail(input.email);
    const existing = existingById ?? existingByEmail;
    const now = new Date().toISOString();
    const user: UserRecord = existing
      ? {
          ...existing,
          ...input,
          email: input.email.toLowerCase(),
          updatedAt: now
        }
      : {
          id: input.id ?? randomUUID(),
          email: input.email.toLowerCase(),
          passwordHash: input.passwordHash,
          displayName: input.displayName,
          role: "User",
          kycStatus: input.kycStatus ?? "Verified",
          twoFAEnabled: input.twoFAEnabled ?? false,
          walletAddresses: input.walletAddresses ?? [],
          notificationPreferences: {
            newDrops: input.notificationPreferences?.newDrops ?? true,
            purchaseConfirmations: input.notificationPreferences?.purchaseConfirmations ?? true,
            transferUpdates: input.notificationPreferences?.transferUpdates ?? true,
            platformAnnouncements: input.notificationPreferences?.platformAnnouncements ?? true
          },
          isActive: input.isActive,
          createdAt: now,
          updatedAt: now,
          lastLoginAt: input.lastLoginAt
        };
    this.users.set(user.id, user);
    this.touch();
    return user;
  }

  updateUser(userId: string, patch: Partial<Omit<UserRecord, "id" | "createdAt">>): UserRecord {
    const current = this.users.get(userId);
    if (!current) {
      throw new Error(`User ${userId} not found`);
    }
    const next: UserRecord = {
      ...current,
      ...patch,
      email: (patch.email ?? current.email).toLowerCase(),
      updatedAt: new Date().toISOString()
    };
    this.users.set(userId, next);
    this.touch();
    return next;
  }

  markUserLogin(userId: string): void {
    const user = this.users.get(userId);
    if (!user) return;
    this.users.set(userId, {
      ...user,
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    this.touch();
  }

  removeUserSession(token: string): void {
    this.userSessions.delete(token);
    this.touch();
  }

  getUserSession(token: string): UserSessionRecord | undefined {
    const session = this.userSessions.get(token);
    if (!session) return undefined;
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      this.userSessions.delete(token);
      this.touch();
      return undefined;
    }
    return session;
  }

  createWebhookEvent(input: Omit<WebhookEventRecord, "id" | "createdAt">): WebhookEventRecord {
    const event: WebhookEventRecord = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString()
    };
    this.webhookEvents.set(event.id, event);
    this.touch();
    return event;
  }

  replaceTrendSources(sources: string[]): string[] {
    const normalizedActiveSources = new Set(sources.map((source) => source.toLowerCase()));
    for (const source of normalizedActiveSources) {
      this.trendSourceStatuses.set(source, "Active");
      if (!this.trendSourceRateLimitModes.has(source)) {
        this.trendSourceRateLimitModes.set(source, "Standard");
      }
    }
    for (const source of this.trendSourceStatuses.keys()) {
      if (!normalizedActiveSources.has(source)) {
        this.trendSourceStatuses.set(source, "Paused");
      }
    }
    this.trendSources.clear();
    for (const source of normalizedActiveSources) {
      this.trendSources.add(source);
    }
    this.touch();
    return [...this.trendSources];
  }

  getTrendSourceStatuses(): Array<{ source: string; status: TrendSourceStatus }> {
    return [...this.trendSourceStatuses.entries()].map(([source, status]) => ({ source, status }));
  }

  getTrendSourceSettings(): Array<{
    source: string;
    status: TrendSourceStatus;
    rateLimitMode: TrendSourceRateLimitMode;
  }> {
    return [...this.trendSourceStatuses.entries()].map(([source, status]) => ({
      source,
      status,
      rateLimitMode: this.trendSourceRateLimitModes.get(source) ?? "Standard"
    }));
  }

  updateTrendSourceSetting(
    source: string,
    patch: Partial<{ status: TrendSourceStatus; rateLimitMode: TrendSourceRateLimitMode }>
  ): { source: string; status: TrendSourceStatus; rateLimitMode: TrendSourceRateLimitMode } {
    const normalized = source.toLowerCase();
    const nextStatus = patch.status ?? this.trendSourceStatuses.get(normalized) ?? "Paused";
    const nextRateLimitMode = patch.rateLimitMode ?? this.trendSourceRateLimitModes.get(normalized) ?? "Standard";
    this.trendSourceStatuses.set(normalized, nextStatus);
    this.trendSourceRateLimitModes.set(normalized, nextRateLimitMode);
    if (nextStatus === "Active") {
      this.trendSources.add(normalized);
    } else {
      this.trendSources.delete(normalized);
    }
    this.touch();
    return {
      source: normalized,
      status: nextStatus,
      rateLimitMode: nextRateLimitMode
    };
  }

  findPartnerApiKeyByRawKey(rawKey: string): PartnerApiKeyRecord | undefined {
    const hash = createHash("sha256").update(rawKey).digest("hex");
    return [...this.partnerApiKeys.values()].find((key) => key.keyHash === hash);
  }

  updatePartnerApiKey(
    id: string,
    patch: Partial<Pick<PartnerApiKeyRecord, "label" | "permissions" | "lastUsedAt">>
  ): PartnerApiKeyRecord {
    const current = this.partnerApiKeys.get(id);
    if (!current) {
      throw new Error(`Partner API key ${id} not found`);
    }
    const next: PartnerApiKeyRecord = {
      ...current,
      ...patch
    };
    this.partnerApiKeys.set(id, next);
    this.touch();
    return next;
  }

  markPartnerApiKeyUsed(id: string): void {
    if (!this.partnerApiKeys.has(id)) return;
    this.updatePartnerApiKey(id, { lastUsedAt: new Date().toISOString() });
  }

  listThemes(): AdminThemeRecord[] {
    return [...this.themes.values()].sort((a, b) => {
      if (a.type !== b.type) return a.type === "Trending" ? -1 : 1;
      return a.priority - b.priority;
    });
  }

  createTheme(input: {
    name: string;
    type: AdminThemeType;
    description?: string;
    active?: boolean;
    priority?: number;
  }): AdminThemeRecord {
    const normalizedName = this.normalizeThemeName(input.name);
    if (!normalizedName) {
      throw new Error("Theme name is required");
    }
    const duplicate = [...this.themes.values()].some(
      (theme) => theme.name.toLowerCase() === normalizedName.toLowerCase()
    );
    if (duplicate) {
      throw new Error("Theme already exists");
    }
    const now = new Date().toISOString();
    const sameType = [...this.themes.values()].filter((theme) => theme.type === input.type);
    const theme: AdminThemeRecord = {
      id: randomUUID(),
      name: normalizedName,
      type: input.type,
      description: input.description?.trim() || (input.type === "Pinned" ? "Pinned by admin" : "Trending theme"),
      active: input.active ?? true,
      priority: input.priority ?? sameType.length + 1,
      createdAt: now,
      updatedAt: now
    };
    this.themes.set(theme.id, theme);
    this.reindexThemesByType(theme.type);
    this.syncPinnedThemesFromThemeRecords();
    this.touch();
    return theme;
  }

  updateTheme(
    id: string,
    patch: Partial<{
      name: string;
      type: AdminThemeType;
      description: string;
      active: boolean;
      priority: number;
    }>
  ): AdminThemeRecord {
    const current = this.themes.get(id);
    if (!current) {
      throw new Error("Theme not found");
    }
    const nextName = patch.name !== undefined ? this.normalizeThemeName(patch.name) : current.name;
    if (!nextName) {
      throw new Error("Theme name is required");
    }
    const duplicate = [...this.themes.values()].some(
      (theme) => theme.id !== id && theme.name.toLowerCase() === nextName.toLowerCase()
    );
    if (duplicate) {
      throw new Error("Theme already exists");
    }
    const nextType = patch.type ?? current.type;
    const next: AdminThemeRecord = {
      ...current,
      name: nextName,
      type: nextType,
      description:
        patch.description !== undefined
          ? patch.description.trim()
          : current.description,
      active: patch.active ?? current.active,
      priority: patch.priority ?? current.priority,
      updatedAt: new Date().toISOString()
    };
    this.themes.set(id, next);
    this.reindexThemesByType(current.type);
    if (nextType !== current.type) {
      this.reindexThemesByType(nextType);
    }
    this.syncPinnedThemesFromThemeRecords();
    this.touch();
    return this.themes.get(id) as AdminThemeRecord;
  }

  deleteTheme(id: string): boolean {
    const current = this.themes.get(id);
    if (!current) return false;
    const removed = this.themes.delete(id);
    if (!removed) return false;
    this.reindexThemesByType(current.type);
    this.syncPinnedThemesFromThemeRecords();
    this.touch();
    return true;
  }

  replacePinnedThemes(themes: string[]): string[] {
    const normalizedInput = themes
      .map((theme) => this.normalizeThemeName(theme))
      .filter((theme) => theme.length > 0);
    const normalizedSet = new Set(normalizedInput.map((theme) => theme.toLowerCase()));
    for (const [id, theme] of this.themes.entries()) {
      if (theme.type !== "Pinned") continue;
      if (!normalizedSet.has(theme.name.toLowerCase())) {
        this.themes.delete(id);
      }
    }
    for (const name of normalizedInput) {
      const existing = [...this.themes.values()].find(
        (theme) => theme.type === "Pinned" && theme.name.toLowerCase() === name.toLowerCase()
      );
      if (existing) continue;
      this.createTheme({ name, type: "Pinned", description: "Pinned by admin", active: true });
    }
    this.reindexThemesByType("Pinned");
    this.syncPinnedThemesFromThemeRecords();
    this.touch();
    return [...this.pinnedThemes];
  }

  private normalizeThemeName(value: string): string {
    return value.trim().replace(/\s+/g, " ");
  }

  private reindexThemesByType(type: AdminThemeType): void {
    const items = [...this.themes.values()]
      .filter((theme) => theme.type === type)
      .sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt));
    items.forEach((theme, index) => {
      this.themes.set(theme.id, {
        ...theme,
        priority: index + 1
      });
    });
  }

  private syncPinnedThemesFromThemeRecords(): void {
    this.pinnedThemes.clear();
    const pinned = [...this.themes.values()]
      .filter((theme) => theme.type === "Pinned" && theme.active)
      .sort((a, b) => a.priority - b.priority);
    for (const theme of pinned) {
      this.pinnedThemes.add(theme.name);
    }
  }

  updateAdminControls(patch: Partial<AdminControlsRecord>): AdminControlsRecord {
    const nextTrendTopicLimit =
      patch.trendTopicLimit !== undefined
        ? Math.max(1, Math.min(10, patch.trendTopicLimit))
        : this.adminControls.trendTopicLimit;
    const nextTrendRefreshIntervalHours =
      patch.trendRefreshIntervalHours !== undefined
        ? Math.max(1, Math.min(168, patch.trendRefreshIntervalHours))
        : this.adminControls.trendRefreshIntervalHours;
    const nextAutoMintIntervalMinutes =
      patch.autoMintIntervalMinutes !== undefined
        ? Math.max(1, patch.autoMintIntervalMinutes)
        : this.adminControls.autoMintIntervalMinutes;
    const nextAutoMintBatchSize =
      patch.autoMintBatchSize !== undefined
        ? Math.max(1, Math.min(10, patch.autoMintBatchSize))
        : this.adminControls.autoMintBatchSize;
    const nextDailyMinimumTarget =
      patch.dailyMinimumTarget !== undefined
        ? Math.max(0, patch.dailyMinimumTarget)
        : this.adminControls.dailyMinimumTarget;
    this.adminControls = {
      ...this.adminControls,
      ...patch,
      trendTopicLimit: nextTrendTopicLimit,
      trendRefreshIntervalHours: nextTrendRefreshIntervalHours,
      autoMintIntervalMinutes: nextAutoMintIntervalMinutes,
      autoMintBatchSize: nextAutoMintBatchSize,
      dailyMinimumTarget: nextDailyMinimumTarget
    };
    this.touch();
    return this.adminControls;
  }

  updateGatewaySettings(patch: Partial<GatewaySettingsRecord>): GatewaySettingsRecord {
    const nextHeader =
      patch.webhookSignatureHeader !== undefined
        ? patch.webhookSignatureHeader.trim().toLowerCase()
        : this.gatewaySettings.webhookSignatureHeader;
    this.gatewaySettings = {
      ...this.gatewaySettings,
      ...patch,
      webhookSignatureHeader: nextHeader || "x-payment-signature"
    };
    this.touch();
    return this.gatewaySettings;
  }

  updatePricingConfig(patch: Partial<PricingConfigRecord>): PricingConfigRecord {
    const normalizedThemeOverrides =
      patch.themeOverrides !== undefined
        ? sanitizePricingMap(patch.themeOverrides, (key) => {
            const normalized = key.trim();
            return normalized.length > 0 ? normalized : undefined;
          })
        : this.pricingConfig.themeOverrides;
    const normalizedSeriesOverrides =
      patch.seriesOverrides !== undefined
        ? sanitizePricingMap(patch.seriesOverrides, (key) => {
            const numeric = Number(key);
            return numeric > 0 ? String(numeric) : undefined;
          })
        : this.pricingConfig.seriesOverrides;
    const normalizedListingOverrides =
      patch.listingOverrides !== undefined
        ? sanitizePricingMap(patch.listingOverrides, (key) => {
            const normalized = key.trim();
            return normalized.length > 0 ? normalized : undefined;
          })
        : this.pricingConfig.listingOverrides;
    const nextBase = patch.basePriceUsd !== undefined ? Math.max(1, Number(patch.basePriceUsd)) : this.pricingConfig.basePriceUsd;
    const nextStep = patch.tokenStepUsd !== undefined ? Math.max(0, Number(patch.tokenStepUsd)) : this.pricingConfig.tokenStepUsd;

    this.pricingConfig = {
      ...this.pricingConfig,
      ...patch,
      basePriceUsd: nextBase,
      tokenStepUsd: nextStep,
      themeOverrides: normalizedThemeOverrides,
      seriesOverrides: normalizedSeriesOverrides,
      listingOverrides: normalizedListingOverrides
    };
    this.touch();
    return this.pricingConfig;
  }

  updateSeriesLifecycleConfig(
    patch: Partial<SeriesLifecycleConfigRecord>
  ): SeriesLifecycleConfigRecord {
    const nextSeriesIdTemplate =
      patch.seriesIdTemplate !== undefined
        ? patch.seriesIdTemplate.trim() || this.seriesLifecycleConfig.seriesIdTemplate
        : this.seriesLifecycleConfig.seriesIdTemplate;
    const nextSeriesMetadataRootTemplate =
      patch.seriesMetadataRootTemplate !== undefined
        ? patch.seriesMetadataRootTemplate.trim()
        : this.seriesLifecycleConfig.seriesMetadataRootTemplate;
    this.seriesLifecycleConfig = {
      ...this.seriesLifecycleConfig,
      ...patch,
      seriesIdTemplate: nextSeriesIdTemplate,
      defaultSeriesMaxSupply:
        patch.defaultSeriesMaxSupply !== undefined
          ? Math.max(1, Number(patch.defaultSeriesMaxSupply))
          : this.seriesLifecycleConfig.defaultSeriesMaxSupply,
      seriesMetadataRootTemplate: nextSeriesMetadataRootTemplate
    };
    this.touch();
    return this.seriesLifecycleConfig;
  }

  appendAuditLog(action: string, actor: string, details: Record<string, unknown>): AuditLogRecord {
    const entry: AuditLogRecord = {
      id: randomUUID(),
      action,
      actor,
      createdAt: new Date().toISOString(),
      details
    };
    this.auditLogs.unshift(entry);
    this.touch();
    return entry;
  }

  listCmsPages(): CmsPageRecord[] {
    return [...this.cmsPages.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  }

  getCmsPage(slug: string): CmsPageRecord | undefined {
    return this.cmsPages.get(slug.trim().toLowerCase());
  }

  upsertCmsPage(input: { slug: string; title: string; content: string; updatedBy: string }): CmsPageRecord {
    const slug = input.slug.trim().toLowerCase();
    if (!slug) {
      throw new Error("CMS page slug is required");
    }
    const now = new Date().toISOString();
    const next: CmsPageRecord = {
      slug,
      title: input.title.trim() || slug,
      content: input.content,
      updatedAt: now,
      updatedBy: input.updatedBy
    };
    this.cmsPages.set(slug, next);
    this.touch();
    return next;
  }
}

const storeFilePath = path.resolve(process.cwd(), config.persistence.storeFilePath);
let persistTimer: NodeJS.Timeout | undefined;
let persistenceInitialized = false;
let pgPool: Pool | undefined;

function saveStoreSnapshotToFile(instance: InMemoryStore): void {
  const snapshot = instance.toSnapshot();
  fs.mkdirSync(path.dirname(storeFilePath), { recursive: true });
  fs.writeFileSync(storeFilePath, JSON.stringify(snapshot, null, 2), "utf8");
}

function loadStoreSnapshotFromFile(instance: InMemoryStore): void {
  if (!fs.existsSync(storeFilePath)) return;
  const raw = fs.readFileSync(storeFilePath, "utf8");
  if (!raw.trim()) return;
  const parsed = JSON.parse(raw) as Partial<StoreSnapshot>;
  instance.hydrate(parsed);
}

async function ensurePgPool(): Promise<Pool> {
  if (pgPool) {
    return pgPool;
  }
  // Use explicit connection fields so pg does not re-parse sslmode query params from URL.
  pgPool = new Pool({
    host: config.persistence.postgres.host,
    port: config.persistence.postgres.port,
    user: config.persistence.postgres.user,
    password: config.persistence.postgres.password,
    database: config.persistence.postgres.database,
    ssl: config.persistence.postgres.ssl
  });
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS trend_topics (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      topic TEXT NOT NULL,
      score DOUBLE PRECISION NOT NULL,
      pinned BOOLEAN NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS generation_jobs (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      prompt TEXT NOT NULL,
      status TEXT NOT NULL,
      error TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS generated_assets (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      prompt TEXT NOT NULL,
      media_url TEXT NOT NULL,
      provider TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mint_records (
      id TEXT PRIMARY KEY,
      series_id INTEGER NOT NULL,
      to_wallet TEXT NOT NULL,
      token_uri TEXT NOT NULL,
      tx_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      token_id INTEGER NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS listing_records (
      id TEXT PRIMARY KEY,
      token_id INTEGER NOT NULL,
      series_id INTEGER NOT NULL DEFAULT 1,
      edition_size INTEGER NOT NULL DEFAULT 1,
      edition_number INTEGER NOT NULL DEFAULT 1,
      edition_available INTEGER NOT NULL DEFAULT 1,
      owner_wallet TEXT NOT NULL,
      token_uri TEXT NOT NULL,
      image_url TEXT NULL,
      themes JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
    ALTER TABLE listing_records ADD COLUMN IF NOT EXISTS image_url TEXT NULL;
    ALTER TABLE listing_records ADD COLUMN IF NOT EXISTS themes JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE listing_records ADD COLUMN IF NOT EXISTS series_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE listing_records ADD COLUMN IF NOT EXISTS edition_size INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE listing_records ADD COLUMN IF NOT EXISTS edition_number INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE listing_records ADD COLUMN IF NOT EXISTS edition_available INTEGER NOT NULL DEFAULT 1;
    CREATE TABLE IF NOT EXISTS payment_records (
      id TEXT PRIMARY KEY,
      external_ref TEXT NOT NULL,
      amount_usd DOUBLE PRECISION NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS receipt_records (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL,
      tx_hash TEXT NOT NULL,
      wallet TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS payment_sessions (
      payment_id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      token_id INTEGER NOT NULL,
      buyer_address TEXT NOT NULL,
      seller_address TEXT NOT NULL,
      amount_usd DOUBLE PRECISION NOT NULL,
      currency TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      checkout_url TEXT NULL,
      settlement_status TEXT NOT NULL,
      tx_hash TEXT NULL,
      receipt_id TEXT NULL,
      error TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL,
      is_active BOOLEAN NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      last_login_at TIMESTAMPTZ NULL
    );
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL,
      kyc_status TEXT NOT NULL DEFAULT 'Verified',
      two_fa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      wallet_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
      notification_preferences JSONB NOT NULL DEFAULT '{"newDrops":true,"purchaseConfirmations":true,"transferUpdates":true,"platformAnnouncements":true}'::jsonb,
      is_active BOOLEAN NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      last_login_at TIMESTAMPTZ NULL
    );
    CREATE TABLE IF NOT EXISTS user_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
    ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS user_id TEXT;
    ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS display_name TEXT;
    ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS role TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'Verified';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_addresses JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{"newDrops":true,"purchaseConfirmations":true,"transferUpdates":true,"platformAnnouncements":true}'::jsonb;
    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      external_ref TEXT NULL,
      status TEXT NOT NULL,
      reason TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pinned_themes (
      theme TEXT PRIMARY KEY
    );
    CREATE TABLE IF NOT EXISTS admin_themes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      active BOOLEAN NOT NULL,
      priority INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS trend_sources (
      source TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'Active',
      rate_limit_mode TEXT NOT NULL DEFAULT 'Standard'
    );
    ALTER TABLE trend_sources ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active';
    ALTER TABLE trend_sources ADD COLUMN IF NOT EXISTS rate_limit_mode TEXT NOT NULL DEFAULT 'Standard';
    CREATE TABLE IF NOT EXISTS mint_counters_meta (
      id INTEGER PRIMARY KEY,
      date_key TEXT NOT NULL,
      per_day INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mint_counter_hours (
      hour_key TEXT PRIMARY KEY,
      count INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admin_controls (
      id INTEGER PRIMARY KEY,
      daily_cap INTEGER NOT NULL,
      hourly_cap INTEGER NOT NULL,
      pipeline_enabled BOOLEAN NOT NULL,
      schedule_enabled BOOLEAN NOT NULL,
      trend_topic_limit INTEGER NOT NULL DEFAULT 3,
      trend_refresh_interval_hours INTEGER NOT NULL DEFAULT 24,
      auto_mint_interval_minutes INTEGER NOT NULL DEFAULT 15,
      auto_mint_batch_size INTEGER NOT NULL DEFAULT 1,
      daily_minimum_target INTEGER NOT NULL DEFAULT 0
    );
    ALTER TABLE admin_controls ADD COLUMN IF NOT EXISTS trend_topic_limit INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE admin_controls ADD COLUMN IF NOT EXISTS trend_refresh_interval_hours INTEGER NOT NULL DEFAULT 24;
    ALTER TABLE admin_controls ADD COLUMN IF NOT EXISTS auto_mint_interval_minutes INTEGER NOT NULL DEFAULT 15;
    ALTER TABLE admin_controls ADD COLUMN IF NOT EXISTS auto_mint_batch_size INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE admin_controls ADD COLUMN IF NOT EXISTS daily_minimum_target INTEGER NOT NULL DEFAULT 0;
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY,
      default_edition_size INTEGER NOT NULL,
      gateway_provider TEXT NOT NULL DEFAULT 'mock',
      gateway_mode TEXT NOT NULL DEFAULT 'sandbox',
      webhook_verification_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      webhook_signature_header TEXT NOT NULL DEFAULT 'x-payment-signature',
      pricing_config JSONB NOT NULL DEFAULT '{}'::jsonb,
      series_lifecycle_config JSONB NOT NULL DEFAULT '{}'::jsonb
    );
    ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS gateway_provider TEXT NOT NULL DEFAULT 'mock';
    ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS gateway_mode TEXT NOT NULL DEFAULT 'sandbox';
    ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS webhook_verification_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS webhook_signature_header TEXT NOT NULL DEFAULT 'x-payment-signature';
    ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS pricing_config JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS series_lifecycle_config JSONB NOT NULL DEFAULT '{}'::jsonb;
    CREATE TABLE IF NOT EXISTS edition_overrides (
      series_key TEXT PRIMARY KEY,
      size INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS partner_api_keys (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      last_used_at TEXT NOT NULL,
      permissions JSONB NOT NULL
    );
    ALTER TABLE partner_api_keys ADD COLUMN IF NOT EXISTS key_hash TEXT NULL;
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      details JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cms_pages (
      slug TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      updated_by TEXT NOT NULL
    );
  `);
  return pgPool;
}

async function loadStoreSnapshotFromPostgres(instance: InMemoryStore): Promise<boolean> {
  const pool = await ensurePgPool();
  const [
    trendRows,
    jobRows,
    assetRows,
    mintRows,
    listingRows,
    paymentRows,
    receiptRows,
    paymentSessionRows,
    adminUserRows,
    adminSessionRows,
    userRows,
    userSessionRows,
    webhookRows,
    idempotencyRows,
    themeRows,
    pinnedThemeRows,
    trendSourceRows,
    mintMetaRows,
    mintHourRows,
    adminControlRows,
    appSettingsRows,
    editionOverrideRows,
    partnerKeyRows,
    auditLogRows,
    cmsPageRows
  ] = await Promise.all([
    pool.query("SELECT * FROM trend_topics"),
    pool.query("SELECT * FROM generation_jobs"),
    pool.query("SELECT * FROM generated_assets"),
    pool.query("SELECT * FROM mint_records"),
    pool.query("SELECT * FROM listing_records"),
    pool.query("SELECT * FROM payment_records"),
    pool.query("SELECT * FROM receipt_records"),
    pool.query("SELECT * FROM payment_sessions"),
    pool.query("SELECT * FROM admin_users"),
    pool.query("SELECT * FROM admin_sessions"),
    pool.query("SELECT * FROM users"),
    pool.query("SELECT * FROM user_sessions"),
    pool.query("SELECT * FROM webhook_events"),
    pool.query("SELECT * FROM idempotency_keys"),
    pool.query("SELECT * FROM admin_themes"),
    pool.query("SELECT * FROM pinned_themes"),
    pool.query("SELECT * FROM trend_sources"),
    pool.query("SELECT * FROM mint_counters_meta WHERE id = 1"),
    pool.query("SELECT * FROM mint_counter_hours"),
    pool.query("SELECT * FROM admin_controls WHERE id = 1"),
    pool.query("SELECT * FROM app_settings WHERE id = 1"),
    pool.query("SELECT * FROM edition_overrides"),
    pool.query("SELECT * FROM partner_api_keys"),
    pool.query("SELECT * FROM audit_logs ORDER BY created_at DESC"),
    pool.query("SELECT * FROM cms_pages")
  ]);

  const hasAnyRows = [
    trendRows.rowCount,
    jobRows.rowCount,
    assetRows.rowCount,
    mintRows.rowCount,
    listingRows.rowCount,
    paymentRows.rowCount,
    receiptRows.rowCount,
    paymentSessionRows.rowCount,
    adminUserRows.rowCount,
    adminSessionRows.rowCount,
    userRows.rowCount,
    userSessionRows.rowCount,
    webhookRows.rowCount,
    idempotencyRows.rowCount,
    themeRows.rowCount,
    pinnedThemeRows.rowCount,
    trendSourceRows.rowCount,
    mintMetaRows.rowCount,
    mintHourRows.rowCount,
    adminControlRows.rowCount,
    appSettingsRows.rowCount,
    editionOverrideRows.rowCount,
    partnerKeyRows.rowCount,
    auditLogRows.rowCount,
    cmsPageRows.rowCount
  ].some((count) => Number(count) > 0);

  if (!hasAnyRows) return false;

  const snapshot: Partial<StoreSnapshot> = {
    trends: trendRows.rows.map((row) => ({
      id: row.id,
      source: row.source,
      topic: row.topic,
      score: Number(row.score),
      pinned: Boolean(row.pinned),
      createdAt: new Date(row.created_at).toISOString()
    })),
    jobs: jobRows.rows.map((row) => ({
      id: row.id,
      topicId: row.topic_id,
      prompt: row.prompt,
      status: row.status,
      error: row.error ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    })),
    assets: assetRows.rows.map((row) => ({
      id: row.id,
      jobId: row.job_id,
      topic: row.topic,
      prompt: row.prompt,
      mediaUrl: row.media_url,
      provider: row.provider,
      createdAt: new Date(row.created_at).toISOString()
    })),
    mints: mintRows.rows.map((row) => ({
      id: row.id,
      seriesId: Number(row.series_id),
      to: row.to_wallet,
      tokenUri: row.token_uri,
      txHash: row.tx_hash,
      status: row.status,
      tokenId: row.token_id ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    })),
    listings: listingRows.rows.map((row) => ({
      id: row.id,
      tokenId: Number(row.token_id),
      seriesId: Number(row.series_id ?? config.defaultSeriesId),
      editionSize: Number(row.edition_size ?? 1),
      editionNumber: Number(row.edition_number ?? 1),
      editionAvailable: Number(row.edition_available ?? 1),
      owner: row.owner_wallet,
      tokenUri: row.token_uri,
      imageUrl: row.image_url ?? undefined,
      themes: Array.isArray(row.themes)
        ? row.themes.map((item: unknown) => String(item))
        : [],
      status: row.status,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    })),
    payments: paymentRows.rows.map((row) => ({
      id: row.id,
      externalRef: row.external_ref,
      amountUsd: Number(row.amount_usd),
      currency: row.currency,
      status: row.status,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    })),
    receipts: receiptRows.rows.map((row) => ({
      id: row.id,
      paymentId: row.payment_id,
      txHash: row.tx_hash,
      wallet: row.wallet,
      createdAt: new Date(row.created_at).toISOString()
    })),
    paymentSessions: paymentSessionRows.rows.map((row) => ({
      paymentId: row.payment_id,
      listingId: row.listing_id,
      tokenId: Number(row.token_id),
      buyerAddress: row.buyer_address,
      sellerAddress: row.seller_address,
      amountUsd: Number(row.amount_usd),
      currency: row.currency,
      idempotencyKey: row.idempotency_key,
      checkoutUrl: row.checkout_url ?? undefined,
      settlementStatus: row.settlement_status,
      txHash: row.tx_hash ?? undefined,
      receiptId: row.receipt_id ?? undefined,
      error: row.error ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    })),
    adminUsers: adminUserRows.rows.map((row) => ({
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      displayName: row.display_name,
      role: "Admin",
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : undefined
    })),
    adminSessions: adminSessionRows.rows.map((row) => ({
      token: row.token,
      userId: row.user_id ?? row.email,
      email: row.email,
      displayName: row.display_name ?? row.email,
      role: (row.role as "Admin") ?? "Admin",
      expiresAt: new Date(row.expires_at).toISOString(),
      createdAt: new Date(row.created_at).toISOString()
    })),
    users: userRows.rows.map((row) => ({
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      displayName: row.display_name,
      role: "User",
      kycStatus:
        row.kyc_status === "NotStarted" ||
        row.kyc_status === "Pending" ||
        row.kyc_status === "Rejected"
          ? row.kyc_status
          : "Verified",
      twoFAEnabled: Boolean(row.two_fa_enabled),
      walletAddresses: Array.isArray(row.wallet_addresses)
        ? row.wallet_addresses
            .map((item: unknown) => String(item).trim())
            .filter((item: string) => item.length > 0)
        : [],
      notificationPreferences: {
        newDrops:
          row.notification_preferences &&
          typeof row.notification_preferences === "object" &&
          "newDrops" in row.notification_preferences
            ? Boolean((row.notification_preferences as Record<string, unknown>).newDrops)
            : true,
        purchaseConfirmations:
          row.notification_preferences &&
          typeof row.notification_preferences === "object" &&
          "purchaseConfirmations" in row.notification_preferences
            ? Boolean((row.notification_preferences as Record<string, unknown>).purchaseConfirmations)
            : true,
        transferUpdates:
          row.notification_preferences &&
          typeof row.notification_preferences === "object" &&
          "transferUpdates" in row.notification_preferences
            ? Boolean((row.notification_preferences as Record<string, unknown>).transferUpdates)
            : true,
        platformAnnouncements:
          row.notification_preferences &&
          typeof row.notification_preferences === "object" &&
          "platformAnnouncements" in row.notification_preferences
            ? Boolean((row.notification_preferences as Record<string, unknown>).platformAnnouncements)
            : true
      },
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : undefined
    })),
    userSessions: userSessionRows.rows.map((row) => ({
      token: row.token,
      userId: row.user_id,
      email: row.email,
      displayName: row.display_name,
      role: "User",
      expiresAt: new Date(row.expires_at).toISOString(),
      createdAt: new Date(row.created_at).toISOString()
    })),
    webhookEvents: webhookRows.rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      externalRef: row.external_ref ?? undefined,
      status: row.status,
      reason: row.reason ?? undefined,
      createdAt: new Date(row.created_at).toISOString()
    })),
    idempotency: idempotencyRows.rows.map((row) => [row.key, row.payment_id]),
    themes: themeRows.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      type: (row.type === "Pinned" ? "Pinned" : "Trending") as AdminThemeType,
      description: row.description as string,
      active: Boolean(row.active),
      priority: Number(row.priority),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    })),
    pinnedThemes: pinnedThemeRows.rows.map((row) => row.theme),
    trendSources: trendSourceRows.rows
      .filter((row) => (row.status as string | undefined) !== "Paused")
      .map((row) => row.source),
    trendSourceStatuses: trendSourceRows.rows.map((row) => [
      row.source as string,
      (row.status === "Paused" ? "Paused" : "Active") as TrendSourceStatus
    ]),
    trendSourceRateLimitModes: trendSourceRows.rows.map((row) => [
      row.source as string,
      (row.rate_limit_mode === "Aggressive" || row.rate_limit_mode === "Conservative"
        ? row.rate_limit_mode
        : "Standard") as TrendSourceRateLimitMode
    ]),
    mintCounters: {
      date: mintMetaRows.rows[0]?.date_key ?? new Date().toISOString().slice(0, 10),
      perDay: Number(mintMetaRows.rows[0]?.per_day ?? 0),
      perHour: Object.fromEntries(
        mintHourRows.rows.map((row) => [row.hour_key as string, Number(row.count)])
      )
    },
    adminControls: adminControlRows.rows[0]
      ? {
          dailyCap: Number(adminControlRows.rows[0].daily_cap),
          hourlyCap: Number(adminControlRows.rows[0].hourly_cap),
          pipelineEnabled: Boolean(adminControlRows.rows[0].pipeline_enabled),
          scheduleEnabled: Boolean(adminControlRows.rows[0].schedule_enabled),
          trendTopicLimit: Math.max(1, Math.min(10, Number(adminControlRows.rows[0].trend_topic_limit ?? 3))),
          trendRefreshIntervalHours: Math.max(
            1,
            Math.min(168, Number(adminControlRows.rows[0].trend_refresh_interval_hours ?? 24))
          ),
          autoMintIntervalMinutes: Math.max(1, Number(adminControlRows.rows[0].auto_mint_interval_minutes ?? 15)),
          autoMintBatchSize: Math.max(1, Math.min(10, Number(adminControlRows.rows[0].auto_mint_batch_size ?? 1))),
          dailyMinimumTarget: Math.max(0, Number(adminControlRows.rows[0].daily_minimum_target ?? 0))
        }
      : undefined,
    gatewaySettings: appSettingsRows.rows[0]
      ? {
          provider:
            appSettingsRows.rows[0].gateway_provider === "generic" ||
            appSettingsRows.rows[0].gateway_provider === "vellis" ||
            appSettingsRows.rows[0].gateway_provider === "wert" ||
            appSettingsRows.rows[0].gateway_provider === "nowpayments"
              ? appSettingsRows.rows[0].gateway_provider
              : "mock",
          mode: appSettingsRows.rows[0].gateway_mode === "live" ? "live" : "sandbox",
          webhookVerificationEnabled: Boolean(appSettingsRows.rows[0].webhook_verification_enabled),
          webhookSignatureHeader:
            typeof appSettingsRows.rows[0].webhook_signature_header === "string" &&
            appSettingsRows.rows[0].webhook_signature_header.trim().length > 0
              ? appSettingsRows.rows[0].webhook_signature_header.trim().toLowerCase()
              : "x-payment-signature"
        }
      : undefined,
    pricingConfig: appSettingsRows.rows[0]
      ? {
          basePriceUsd: Math.max(
            1,
            Number(
              (appSettingsRows.rows[0].pricing_config as { basePriceUsd?: unknown } | undefined)
                ?.basePriceUsd ?? 100
            )
          ),
          tokenStepUsd: Math.max(
            0,
            Number(
              (appSettingsRows.rows[0].pricing_config as { tokenStepUsd?: unknown } | undefined)
                ?.tokenStepUsd ?? 15
            )
          ),
          themeOverrides: sanitizePricingMap(
            (appSettingsRows.rows[0].pricing_config as { themeOverrides?: Record<string, unknown> } | undefined)
              ?.themeOverrides,
            (key) => {
              const normalized = key.trim();
              return normalized.length > 0 ? normalized : undefined;
            }
          ),
          seriesOverrides: sanitizePricingMap(
            (appSettingsRows.rows[0].pricing_config as { seriesOverrides?: Record<string, unknown> } | undefined)
              ?.seriesOverrides,
            (key) => {
              const numeric = Number(key);
              return numeric > 0 ? String(numeric) : undefined;
            }
          ),
          listingOverrides: sanitizePricingMap(
            (appSettingsRows.rows[0].pricing_config as { listingOverrides?: Record<string, unknown> } | undefined)
              ?.listingOverrides,
            (key) => {
              const normalized = key.trim();
              return normalized.length > 0 ? normalized : undefined;
            }
          )
        }
      : undefined,
    seriesLifecycleConfig: appSettingsRows.rows[0]
      ? {
          autoSeriesEnabled: Boolean(
            (appSettingsRows.rows[0].series_lifecycle_config as { autoSeriesEnabled?: unknown } | undefined)
              ?.autoSeriesEnabled ?? false
          ),
          seriesIdTemplate: String(
            (appSettingsRows.rows[0].series_lifecycle_config as { seriesIdTemplate?: unknown } | undefined)
              ?.seriesIdTemplate ?? "next"
          ).trim() || "next",
          defaultSeriesMaxSupply: Math.max(
            1,
            Number(
              (appSettingsRows.rows[0].series_lifecycle_config as { defaultSeriesMaxSupply?: unknown } | undefined)
                ?.defaultSeriesMaxSupply ?? config.defaultEditionSize
            )
          ),
          seriesMetadataRootTemplate: String(
            (appSettingsRows.rows[0].series_lifecycle_config as { seriesMetadataRootTemplate?: unknown } | undefined)
              ?.seriesMetadataRootTemplate ?? ""
          ).trim()
        }
      : undefined,
    defaultEditionSize: appSettingsRows.rows[0]
      ? Number(appSettingsRows.rows[0].default_edition_size)
      : undefined,
    editionOverrides: editionOverrideRows.rows.map((row) => [row.series_key as string, Number(row.size)]),
    partnerApiKeys: partnerKeyRows.rows.map((row) => ({
      id: row.id,
      label: row.label,
      keyPrefix: row.key_prefix,
      keyHash: row.key_hash ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
      lastUsedAt: row.last_used_at,
      permissions: Array.isArray(row.permissions) ? row.permissions : []
    })),
    auditLogs: auditLogRows.rows.map((row) => ({
      id: row.id,
      action: row.action,
      actor: row.actor,
      createdAt: new Date(row.created_at).toISOString(),
      details: row.details ?? {}
    })),
    cmsPages: cmsPageRows.rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      content: row.content,
      updatedAt: new Date(row.updated_at).toISOString(),
      updatedBy: row.updated_by
    }))
  };

  instance.hydrate(snapshot);
  return true;
}

async function saveStoreSnapshotToPostgres(instance: InMemoryStore): Promise<void> {
  const pool = await ensurePgPool();
  const snapshot = instance.toSnapshot();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM trend_topics");
    for (const row of snapshot.trends) {
      await client.query(
        `INSERT INTO trend_topics (id, source, topic, score, pinned, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [row.id, row.source, row.topic, row.score, row.pinned, row.createdAt]
      );
    }

    await client.query("DELETE FROM generation_jobs");
    for (const row of snapshot.jobs) {
      await client.query(
        `INSERT INTO generation_jobs (id, topic_id, prompt, status, error, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [row.id, row.topicId, row.prompt, row.status, row.error ?? null, row.createdAt, row.updatedAt]
      );
    }

    await client.query("DELETE FROM generated_assets");
    for (const row of snapshot.assets) {
      await client.query(
        `INSERT INTO generated_assets (id, job_id, topic, prompt, media_url, provider, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [row.id, row.jobId, row.topic, row.prompt, row.mediaUrl, row.provider, row.createdAt]
      );
    }

    await client.query("DELETE FROM mint_records");
    for (const row of snapshot.mints) {
      await client.query(
        `INSERT INTO mint_records (id, series_id, to_wallet, token_uri, tx_hash, status, token_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [row.id, row.seriesId, row.to, row.tokenUri, row.txHash, row.status, row.tokenId ?? null, row.createdAt, row.updatedAt]
      );
    }

    await client.query("DELETE FROM listing_records");
    for (const row of snapshot.listings) {
      await client.query(
        `INSERT INTO listing_records
         (id, token_id, series_id, edition_size, edition_number, edition_available, owner_wallet, token_uri, image_url, themes, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13)`,
        [
          row.id,
          row.tokenId,
          row.seriesId,
          row.editionSize,
          row.editionNumber,
          row.editionAvailable,
          row.owner,
          row.tokenUri,
          row.imageUrl ?? null,
          JSON.stringify(row.themes ?? []),
          row.status,
          row.createdAt,
          row.updatedAt
        ]
      );
    }

    await client.query("DELETE FROM payment_records");
    for (const row of snapshot.payments) {
      await client.query(
        `INSERT INTO payment_records (id, external_ref, amount_usd, currency, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [row.id, row.externalRef, row.amountUsd, row.currency, row.status, row.createdAt, row.updatedAt]
      );
    }

    await client.query("DELETE FROM receipt_records");
    for (const row of snapshot.receipts) {
      await client.query(
        `INSERT INTO receipt_records (id, payment_id, tx_hash, wallet, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [row.id, row.paymentId, row.txHash, row.wallet, row.createdAt]
      );
    }

    await client.query("DELETE FROM payment_sessions");
    for (const row of snapshot.paymentSessions) {
      await client.query(
        `INSERT INTO payment_sessions
         (payment_id, listing_id, token_id, buyer_address, seller_address, amount_usd, currency, idempotency_key, checkout_url, settlement_status, tx_hash, receipt_id, error, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          row.paymentId,
          row.listingId,
          row.tokenId,
          row.buyerAddress,
          row.sellerAddress,
          row.amountUsd,
          row.currency,
          row.idempotencyKey,
          row.checkoutUrl ?? null,
          row.settlementStatus,
          row.txHash ?? null,
          row.receiptId ?? null,
          row.error ?? null,
          row.createdAt,
          row.updatedAt
        ]
      );
    }

    await client.query("DELETE FROM admin_users");
    for (const row of snapshot.adminUsers) {
      await client.query(
        `INSERT INTO admin_users (id, email, password_hash, display_name, role, is_active, created_at, updated_at, last_login_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          row.id,
          row.email,
          row.passwordHash,
          row.displayName,
          row.role,
          row.isActive,
          row.createdAt,
          row.updatedAt,
          row.lastLoginAt ?? null
        ]
      );
    }

    await client.query("DELETE FROM admin_sessions");
    for (const row of snapshot.adminSessions) {
      await client.query(
        `INSERT INTO admin_sessions (token, user_id, email, display_name, role, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [row.token, row.userId, row.email, row.displayName, row.role, row.expiresAt, row.createdAt]
      );
    }

    await client.query("DELETE FROM users");
    for (const row of snapshot.users) {
      await client.query(
        `INSERT INTO users
         (id, email, password_hash, display_name, role, kyc_status, two_fa_enabled, wallet_addresses, notification_preferences, is_active, created_at, updated_at, last_login_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12, $13)`,
        [
          row.id,
          row.email,
          row.passwordHash,
          row.displayName,
          row.role,
          row.kycStatus,
          row.twoFAEnabled,
          JSON.stringify(row.walletAddresses ?? []),
          JSON.stringify(row.notificationPreferences ?? {
            newDrops: true,
            purchaseConfirmations: true,
            transferUpdates: true,
            platformAnnouncements: true
          }),
          row.isActive,
          row.createdAt,
          row.updatedAt,
          row.lastLoginAt ?? null
        ]
      );
    }

    await client.query("DELETE FROM user_sessions");
    for (const row of snapshot.userSessions) {
      await client.query(
        `INSERT INTO user_sessions (token, user_id, email, display_name, role, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [row.token, row.userId, row.email, row.displayName, row.role, row.expiresAt, row.createdAt]
      );
    }

    await client.query("DELETE FROM webhook_events");
    for (const row of snapshot.webhookEvents) {
      await client.query(
        `INSERT INTO webhook_events (id, kind, external_ref, status, reason, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [row.id, row.kind, row.externalRef ?? null, row.status, row.reason ?? null, row.createdAt]
      );
    }

    await client.query("DELETE FROM idempotency_keys");
    for (const [key, paymentId] of snapshot.idempotency) {
      await client.query(
        `INSERT INTO idempotency_keys (key, payment_id) VALUES ($1, $2)`,
        [key, paymentId]
      );
    }

    await client.query("DELETE FROM admin_themes");
    for (const row of snapshot.themes) {
      await client.query(
        `INSERT INTO admin_themes (id, name, type, description, active, priority, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          row.id,
          row.name,
          row.type,
          row.description,
          row.active,
          row.priority,
          row.createdAt,
          row.updatedAt
        ]
      );
    }

    await client.query("DELETE FROM pinned_themes");
    for (const theme of snapshot.pinnedThemes) {
      await client.query(`INSERT INTO pinned_themes (theme) VALUES ($1)`, [theme]);
    }

    await client.query("DELETE FROM trend_sources");
    for (const [source, status] of snapshot.trendSourceStatuses) {
      await client.query(`INSERT INTO trend_sources (source, status, rate_limit_mode) VALUES ($1, $2, $3)`, [
        source,
        status,
        snapshot.trendSourceRateLimitModes.find(([key]) => key === source)?.[1] ?? "Standard"
      ]);
    }

    await client.query("DELETE FROM mint_counter_hours");
    for (const [hourKey, count] of Object.entries(snapshot.mintCounters.perHour)) {
      await client.query(
        `INSERT INTO mint_counter_hours (hour_key, count) VALUES ($1, $2)`,
        [hourKey, count]
      );
    }
    await client.query("DELETE FROM mint_counters_meta WHERE id = 1");
    await client.query(
      `INSERT INTO mint_counters_meta (id, date_key, per_day) VALUES (1, $1, $2)`,
      [snapshot.mintCounters.date, snapshot.mintCounters.perDay]
    );

    await client.query("DELETE FROM admin_controls WHERE id = 1");
    await client.query(
      `INSERT INTO admin_controls
       (
        id,
        daily_cap,
        hourly_cap,
        pipeline_enabled,
        schedule_enabled,
        trend_topic_limit,
       trend_refresh_interval_hours,
        auto_mint_interval_minutes,
       auto_mint_batch_size,
       daily_minimum_target
       )
       VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        snapshot.adminControls.dailyCap,
        snapshot.adminControls.hourlyCap,
        snapshot.adminControls.pipelineEnabled,
        snapshot.adminControls.scheduleEnabled,
        snapshot.adminControls.trendTopicLimit,
        snapshot.adminControls.trendRefreshIntervalHours,
        snapshot.adminControls.autoMintIntervalMinutes,
        snapshot.adminControls.autoMintBatchSize,
        snapshot.adminControls.dailyMinimumTarget
      ]
    );

    await client.query("DELETE FROM app_settings WHERE id = 1");
    await client.query(
      `INSERT INTO app_settings
       (
        id,
        default_edition_size,
        gateway_provider,
        gateway_mode,
        webhook_verification_enabled,
        webhook_signature_header,
       pricing_config,
       series_lifecycle_config
       )
       VALUES (1, $1, $2, $3, $4, $5, $6, $7)`,
      [
        snapshot.defaultEditionSize,
        snapshot.gatewaySettings.provider,
        snapshot.gatewaySettings.mode,
        snapshot.gatewaySettings.webhookVerificationEnabled,
        snapshot.gatewaySettings.webhookSignatureHeader,
        JSON.stringify(snapshot.pricingConfig),
        JSON.stringify(snapshot.seriesLifecycleConfig)
      ]
    );

    await client.query("DELETE FROM edition_overrides");
    for (const [seriesKey, size] of snapshot.editionOverrides) {
      await client.query(
        `INSERT INTO edition_overrides (series_key, size) VALUES ($1, $2)`,
        [seriesKey, size]
      );
    }

    await client.query("DELETE FROM partner_api_keys");
    for (const row of snapshot.partnerApiKeys) {
      await client.query(
        `INSERT INTO partner_api_keys (id, label, key_prefix, key_hash, created_at, last_used_at, permissions)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [row.id, row.label, row.keyPrefix, row.keyHash ?? null, row.createdAt, row.lastUsedAt, JSON.stringify(row.permissions)]
      );
    }

    await client.query("DELETE FROM audit_logs");
    for (const row of snapshot.auditLogs) {
      await client.query(
        `INSERT INTO audit_logs (id, action, actor, created_at, details)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [row.id, row.action, row.actor, row.createdAt, JSON.stringify(row.details)]
      );
    }

    await client.query("DELETE FROM cms_pages");
    for (const row of snapshot.cmsPages) {
      await client.query(
        `INSERT INTO cms_pages (slug, title, content, updated_at, updated_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [row.slug, row.title, row.content, row.updatedAt, row.updatedBy]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function bindPersistence(instance: InMemoryStore): void {
  instance.setMutationHook(() => {
    if (persistTimer) {
      clearTimeout(persistTimer);
    }
    persistTimer = setTimeout(() => {
      if (config.persistence.driver === "postgres") {
        void saveStoreSnapshotToPostgres(instance).catch((error) => {
          logger.error({ err: error }, "Failed to persist snapshot to Postgres");
        });
        return;
      }
      try {
        saveStoreSnapshotToFile(instance);
      } catch (error) {
        logger.error({ err: error }, "Failed to persist snapshot to file");
      }
    }, 150);
  });
}

function ensureDefaultAdminUser(instance: InMemoryStore): boolean {
  const email = config.admin.email.toLowerCase();
  const existing = instance.findAdminUserByEmail(email);
  if (existing) {
    return false;
  }

  const passwordHash = config.admin.passwordHash ?? hashPassword(config.admin.password);
  instance.upsertAdminUser({
    email,
    passwordHash,
    displayName: "System Admin",
    role: "Admin",
    isActive: true
  });
  return true;
}

export async function initializeStorePersistence(): Promise<void> {
  if (persistenceInitialized || !config.persistence.enabled) {
    return;
  }

  if (config.persistence.driver === "postgres") {
    const loadedFromPostgres = await loadStoreSnapshotFromPostgres(store);
    if (!loadedFromPostgres && fs.existsSync(storeFilePath)) {
      loadStoreSnapshotFromFile(store);
      await saveStoreSnapshotToPostgres(store);
      logger.info({ file: storeFilePath }, "Seeded Postgres snapshot from file");
    }
    logger.info(
      {
        host: config.persistence.postgres.host,
        port: config.persistence.postgres.port,
        database: config.persistence.postgres.database
      },
      "Store persistence initialized with Postgres"
    );
  } else {
    loadStoreSnapshotFromFile(store);
    logger.info({ file: storeFilePath }, "Store persistence initialized with file snapshot");
  }

  bindPersistence(store);
  const createdDefaultAdmin = ensureDefaultAdminUser(store);
  if (createdDefaultAdmin) {
    if (config.persistence.driver === "postgres") {
      await saveStoreSnapshotToPostgres(store);
    } else {
      saveStoreSnapshotToFile(store);
    }
  }
  persistenceInitialized = true;
}

export function getPersistenceStatus(): {
  enabled: boolean;
  initialized: boolean;
  driver: "file" | "postgres";
  target: { file: string } | { host: string; port: number; database: string };
  connected: boolean;
} {
  if (config.persistence.driver === "postgres") {
    return {
      enabled: config.persistence.enabled,
      initialized: persistenceInitialized,
      driver: "postgres",
      target: {
        host: config.persistence.postgres.host,
        port: config.persistence.postgres.port,
        database: config.persistence.postgres.database
      },
      connected: Boolean(pgPool)
    };
  }

  return {
    enabled: config.persistence.enabled,
    initialized: persistenceInitialized,
    driver: "file",
    target: {
      file: storeFilePath
    },
    connected: true
  };
}

export async function checkPersistenceHealth(): Promise<{
  ok: boolean;
  driver: "file" | "postgres";
  detail: string;
}> {
  if (!config.persistence.enabled) {
    return {
      ok: true,
      driver: config.persistence.driver,
      detail: "Persistence disabled by configuration"
    };
  }

  if (config.persistence.driver === "file") {
    try {
      fs.mkdirSync(path.dirname(storeFilePath), { recursive: true });
      fs.accessSync(path.dirname(storeFilePath), fs.constants.W_OK);
      return {
        ok: true,
        driver: "file",
        detail: `Writable path: ${storeFilePath}`
      };
    } catch (error) {
      return {
        ok: false,
        driver: "file",
        detail: error instanceof Error ? error.message : "File persistence check failed"
      };
    }
  }

  try {
    const pool = await ensurePgPool();
    await pool.query("SELECT 1");
    return {
      ok: true,
      driver: "postgres",
      detail: "Postgres ping succeeded"
    };
  } catch (error) {
    return {
      ok: false,
      driver: "postgres",
      detail: error instanceof Error ? error.message : "Postgres ping failed"
    };
  }
}

export const store = new InMemoryStore();

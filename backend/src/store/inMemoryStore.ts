import { randomUUID } from "crypto";
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

export class InMemoryStore {
  public readonly trends = new Map<string, TrendTopic>();
  public readonly jobs = new Map<string, GenerationJob>();
  public readonly assets = new Map<string, GeneratedAsset>();
  public readonly mints = new Map<string, MintRecord>();
  public readonly listings = new Map<string, ListingRecord>();
  public readonly payments = new Map<string, PaymentRecord>();
  public readonly receipts = new Map<string, ReceiptRecord>();
  public readonly idempotency = new Map<string, string>();
  public readonly pinnedThemes = new Set<string>();
  public readonly trendSources = new Set(["twitter", "instagram", "reddit"]);
  public mintCounters: MintCounters = {
    date: new Date().toISOString().slice(0, 10),
    perDay: 0,
    perHour: {}
  };

  createTrend(input: Omit<TrendTopic, "id" | "createdAt">): TrendTopic {
    const trend: TrendTopic = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString()
    };
    this.trends.set(trend.id, trend);
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
    return next;
  }

  createAsset(asset: Omit<GeneratedAsset, "id" | "createdAt">): GeneratedAsset {
    const next: GeneratedAsset = {
      ...asset,
      id: randomUUID(),
      createdAt: new Date().toISOString()
    };
    this.assets.set(next.id, next);
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
    return next;
  }

  createReceipt(input: Omit<ReceiptRecord, "id" | "createdAt">): ReceiptRecord {
    const receipt: ReceiptRecord = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString()
    };
    this.receipts.set(receipt.id, receipt);
    return receipt;
  }
}

export const store = new InMemoryStore();

import { config } from "../config";
import { AdminThemeRecord } from "../store/inMemoryStore";
import { InMemoryStore } from "../store/inMemoryStore";
import { AiService } from "./aiService";
import { IndexerService } from "./indexerService";
import { IpfsService } from "./ipfsService";
import { MinterService } from "./minterService";
import { PromptBuilderService } from "./promptBuilderService";
import { TrendIngestionService } from "./trendIngestionService";

export class PipelineService {
  private readonly pendingSeriesCreates = new Map<number, Promise<void>>();

  constructor(
    private readonly db: InMemoryStore,
    private readonly trends: TrendIngestionService,
    private readonly prompts: PromptBuilderService,
    private readonly ai: AiService,
    private readonly ipfs: IpfsService,
    private readonly minter: MinterService,
    private readonly indexer: IndexerService
  ) {}

  private resolveEditionOverride(seriesId: number, themeName: string): number | undefined {
    const entries = [...this.db.editionOverrides.entries()];
    const normalizedTheme = themeName.trim().toLowerCase();
    const bySeriesExplicit = entries.find(([key]) => key.trim().toLowerCase() === `series:${seriesId}`);
    if (bySeriesExplicit) return bySeriesExplicit[1];
    const bySeriesNumeric = entries.find(([key]) => key.trim().toLowerCase() === String(seriesId));
    if (bySeriesNumeric) return bySeriesNumeric[1];
    const byTheme = entries.find(([key]) => key.trim().toLowerCase() === normalizedTheme);
    if (byTheme) return byTheme[1];
    return undefined;
  }

  private buildSeriesMetadataRoot(seriesId: number): string {
    const template = this.db.seriesLifecycleConfig.seriesMetadataRootTemplate?.trim();
    if (!template) return "";
    return template.replace(/\{seriesId\}/gi, String(seriesId));
  }

  private deriveTemplateSeriesCandidates(currentSeriesIds: number[]): number[] {
    const template = (this.db.seriesLifecycleConfig.seriesIdTemplate || "next").trim().toLowerCase();
    const sorted = [...currentSeriesIds].sort((a, b) => a - b);
    const maxCurrent = sorted.length > 0 ? sorted[sorted.length - 1] : 0;
    const next = Math.max(1, maxCurrent + 1);

    if (template === "next") {
      return [next];
    }
    if (template.startsWith("start:")) {
      const start = Number(template.slice("start:".length));
      if (Number.isFinite(start) && start > 0) {
        return [Math.max(start, next)];
      }
      return [next];
    }
    if (template.startsWith("list:")) {
      const listValues = template
        .slice("list:".length)
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => Math.trunc(value));
      return [...new Set([...listValues, next])];
    }
    if (template.startsWith("range:")) {
      const [startRaw, endRaw] = template
        .slice("range:".length)
        .split("-")
        .map((item) => Number(item.trim()));
      if (Number.isFinite(startRaw) && Number.isFinite(endRaw) && startRaw > 0 && endRaw >= startRaw) {
        const range: number[] = [];
        for (let id = Math.trunc(startRaw); id <= Math.trunc(endRaw); id += 1) {
          range.push(id);
          if (range.length >= 300) break;
        }
        return [...new Set([...range, next])];
      }
      return [next];
    }
    return [next];
  }

  private async createSeriesWithLock(seriesId: number): Promise<void> {
    const existingPromise = this.pendingSeriesCreates.get(seriesId);
    if (existingPromise) {
      await existingPromise;
      return;
    }
    const createPromise = (async () => {
      await this.minter.createSeries({
        seriesId,
        maxSupply: this.db.seriesLifecycleConfig.defaultSeriesMaxSupply,
        metadataRoot: this.buildSeriesMetadataRoot(seriesId)
      });
    })();
    this.pendingSeriesCreates.set(seriesId, createPromise);
    try {
      await createPromise;
    } finally {
      this.pendingSeriesCreates.delete(seriesId);
    }
  }

  private async resolveSeriesIdForMint(inputSeriesId?: number): Promise<number> {
    const preferredSeriesId = inputSeriesId ?? config.defaultSeriesId;
    try {
      await this.minter.ensureSeriesMintable(preferredSeriesId);
      return preferredSeriesId;
    } catch (error) {
      if (!this.db.seriesLifecycleConfig.autoSeriesEnabled) {
        throw error;
      }
    }

    const availableSeries = await this.minter.getAvailableSeries(300);
    const openSeriesIds = new Set(
      availableSeries
        .filter((item) => Number.isFinite(item.remaining) && item.remaining > 0)
        .map((item) => item.seriesId)
    );
    const currentSeriesIds = availableSeries.map((item) => item.seriesId);
    const candidates = this.deriveTemplateSeriesCandidates(currentSeriesIds);

    // Prefer reusing any currently open series first (latest series first),
    // so we only create a new series when all available series are full.
    const openSeriesSorted = [...openSeriesIds.values()].sort((a, b) => b - a);
    const openCandidate = candidates.find((id) => openSeriesIds.has(id));
    if (openCandidate) {
      return openCandidate;
    }
    if (openSeriesSorted.length > 0) {
      return openSeriesSorted[0];
    }

    // No open series available -> create next candidate that does not exist yet.
    const existingSet = new Set(currentSeriesIds);
    for (const candidate of candidates) {
      if (existingSet.has(candidate)) continue;
      await this.createSeriesWithLock(candidate);
      await this.minter.ensureSeriesMintable(candidate);
      return candidate;
    }

    const fallbackId = Math.max(1, ...currentSeriesIds, config.defaultSeriesId) + 1;
    await this.createSeriesWithLock(fallbackId);
    await this.minter.ensureSeriesMintable(fallbackId);
    return fallbackId;
  }

  private pickNextTheme(activeThemes: AdminThemeRecord[]): string | undefined {
    if (activeThemes.length === 0) return undefined;
    const counts = new Map<string, number>();
    const lastSeenAt = new Map<string, string>();
    const normalizedToTheme = new Map<string, AdminThemeRecord>();
    for (const theme of activeThemes) {
      const key = theme.name.trim().toLowerCase();
      counts.set(key, 0);
      normalizedToTheme.set(key, theme);
    }

    const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;
    const listings = [...this.db.listings.values()]
      .filter((listing) => new Date(listing.updatedAt).getTime() >= cutoffMs)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    for (const listing of listings) {
      for (const name of listing.themes ?? []) {
        const key = name.trim().toLowerCase();
        if (!counts.has(key)) continue;
        counts.set(key, (counts.get(key) ?? 0) + 1);
        if (!lastSeenAt.has(key)) {
          lastSeenAt.set(key, listing.updatedAt);
        }
      }
    }

    const minCount = Math.min(...counts.values());
    const candidates = [...counts.entries()]
      .filter(([, count]) => count === minCount)
      .map(([key]) => normalizedToTheme.get(key))
      .filter((item): item is AdminThemeRecord => Boolean(item))
      .sort((a, b) => {
        const aLast = lastSeenAt.get(a.name.trim().toLowerCase()) ?? "";
        const bLast = lastSeenAt.get(b.name.trim().toLowerCase()) ?? "";
        if (aLast !== bLast) return aLast.localeCompare(bLast);
        return a.priority - b.priority;
      });
    return candidates[0]?.name;
  }

  async runAutomatedMintCycle(input?: {
    recipient?: string;
    seriesId?: number;
    limit?: number;
    themeOverride?: string;
  }) {
    const seriesId = await this.resolveSeriesIdForMint(input?.seriesId);

    const canMint = this.trends.canMintNow();
    if (!canMint.ok) {
      throw new Error(canMint.reason ?? "Mint cap reached");
    }

    const resolvedThemeOverride = input?.themeOverride?.trim().replace(/\s+/g, " ");
    const activeThemes = this.trends.getThemes().filter((theme) => theme.active);
    const selectedTheme =
      resolvedThemeOverride ??
      this.pickNextTheme(activeThemes) ??
      activeThemes.find((theme) => theme.type === "Trending")?.name ??
      "AI Art";
    const resolvedLimit = Math.max(1, Math.min(10, input?.limit ?? this.db.adminControls.trendTopicLimit ?? 3));
    const recentCandidates = this.trends.getRecentTopics(resolvedLimit);
    const candidates = recentCandidates.length > 0 ? recentCandidates : await this.trends.ingestTrends(resolvedLimit);
    const selectedThemeKey = selectedTheme.trim().toLowerCase();
    const matchedTopic = candidates.find((item) => item.topic.toLowerCase().includes(selectedThemeKey));
    const fallbackTopic = candidates.find((item) => !item.pinned) ?? candidates[0];
    const resolvedTopic =
      matchedTopic ??
      this.db.createTrend({
        source: resolvedThemeOverride ? "manual" : fallbackTopic?.source ?? "manual",
        topic: selectedTheme,
        score: fallbackTopic?.score ?? 90,
        pinned: Boolean(resolvedThemeOverride)
      });
    if (!resolvedTopic) {
      throw new Error("No trend topic available");
    }

    const prompt = this.prompts.buildPrompt(resolvedTopic);
    const job = this.db.createJob(resolvedTopic.id, prompt);
    const asset = await this.ai.generateForJob(job, resolvedTopic.topic);
    const configuredEditionSize =
      this.resolveEditionOverride(seriesId, resolvedTopic.topic) ?? this.db.defaultEditionSize;
    const pinned = await this.ipfs.pinAssetAndMetadata(asset, configuredEditionSize);

    const to = input?.recipient ?? "0x000000000000000000000000000000000000dEaD";
    const minted = await this.minter.mintFromSeries(seriesId, to, pinned.metadataUri);

    const mintRecord = this.db.createMint({
      seriesId,
      to,
      tokenUri: pinned.metadataUri,
      txHash: minted.txHash,
      status: "submitted",
      tokenId: minted.tokenId
    });
    this.db.updateMint(mintRecord.id, { status: "confirmed" });
    this.trends.incrementMintCounters();

    const tokenId = minted.tokenId ?? this.db.listings.size + 1;
    const listingThemes = [selectedTheme];
    const seriesInfo = await this.minter.getSeriesInfo(seriesId);
    const editionSize =
      Number.isFinite(seriesInfo.maxSupply) && seriesInfo.maxSupply > 0
        ? seriesInfo.maxSupply
        : configuredEditionSize;
    const editionNumber =
      Number.isFinite(seriesInfo.mintedCount) && seriesInfo.mintedCount > 0
        ? seriesInfo.mintedCount
        : 1;
    const editionAvailable =
      Number.isFinite(seriesInfo.remaining) && seriesInfo.remaining >= 0
        ? seriesInfo.remaining
        : Math.max(0, editionSize - editionNumber);
    const listing = this.indexer.upsertListing({
      tokenId,
      seriesId,
      editionSize,
      editionNumber,
      editionAvailable,
      owner: to,
      tokenUri: pinned.metadataUri,
      imageUrl: pinned.assetUri,
      themes: listingThemes,
      status: "listed"
    });

    return {
      topic: resolvedTopic,
      prompt,
      job,
      asset,
      pinned,
      mint: this.db.mints.get(mintRecord.id),
      listing,
      minterMode: this.minter.mode
    };
  }
}

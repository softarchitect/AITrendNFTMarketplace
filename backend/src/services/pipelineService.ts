import { config } from "../config";
import { InMemoryStore } from "../store/inMemoryStore";
import { AiService } from "./aiService";
import { IndexerService } from "./indexerService";
import { IpfsService } from "./ipfsService";
import { MinterService } from "./minterService";
import { PromptBuilderService } from "./promptBuilderService";
import { TrendIngestionService } from "./trendIngestionService";

export class PipelineService {
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

  async runAutomatedMintCycle(input?: {
    recipient?: string;
    seriesId?: number;
    limit?: number;
    themeOverride?: string;
  }) {
    const seriesId = input?.seriesId ?? config.defaultSeriesId;
    // Preflight chain constraints first so we fail fast before AI/IPFS work.
    await this.minter.ensureSeriesMintable(seriesId);

    const canMint = this.trends.canMintNow();
    if (!canMint.ok) {
      throw new Error(canMint.reason ?? "Mint cap reached");
    }

    const resolvedThemeOverride = input?.themeOverride?.trim().replace(/\s+/g, " ");
    const resolvedLimit = Math.max(1, Math.min(10, input?.limit ?? this.db.adminControls.trendTopicLimit ?? 3));
    const topicCandidates = resolvedThemeOverride
      ? this.db.createTrend({
          source: "manual",
          topic: resolvedThemeOverride,
          score: 100,
          pinned: true
        })
      : undefined;
    const topic =
      topicCandidates ??
      (() => {
        const candidates = this.trends.ingestSimulatedTrends(resolvedLimit);
        return candidates.find((item) => !item.pinned) ?? candidates[0];
      })();
    if (!topic) {
      throw new Error("No trend topic available");
    }

    const prompt = this.prompts.buildPrompt(topic);
    const job = this.db.createJob(topic.id, prompt);
    const asset = await this.ai.generateForJob(job, topic.topic);
    const configuredEditionSize =
      this.resolveEditionOverride(seriesId, topic.topic) ?? this.db.defaultEditionSize;
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
    const activeThemes = this.trends.getThemes().filter((theme) => theme.active);
    const matchedTheme = activeThemes.find(
      (theme) => theme.name.toLowerCase() === topic.topic.toLowerCase()
    );
    const fallbackTheme =
      activeThemes.find((theme) => theme.type === "Trending")?.name ?? "AI Art";
    const listingThemes = matchedTheme
      ? [matchedTheme.name]
      : topic.pinned
        ? [topic.topic]
        : [fallbackTheme];
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
      topic,
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

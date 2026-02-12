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

  async runAutomatedMintCycle(input?: { recipient?: string; seriesId?: number; limit?: number }) {
    const canMint = this.trends.canMintNow();
    if (!canMint.ok) {
      throw new Error(canMint.reason ?? "Mint cap reached");
    }

    const [topic] = this.trends.ingestSimulatedTrends(input?.limit ?? 1);
    if (!topic) {
      throw new Error("No trend topic available");
    }

    const prompt = this.prompts.buildPrompt(topic);
    const job = this.db.createJob(topic.id, prompt);
    const asset = await this.ai.generateForJob(job, topic.topic);
    const pinned = await this.ipfs.pinAssetAndMetadata(asset, config.defaultEditionSize);

    const to = input?.recipient ?? "0x000000000000000000000000000000000000dEaD";
    const seriesId = input?.seriesId ?? config.defaultSeriesId;
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
    const listing = this.indexer.upsertListing({
      tokenId,
      owner: to,
      tokenUri: pinned.metadataUri,
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

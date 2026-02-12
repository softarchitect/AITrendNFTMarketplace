import { InMemoryStore, store } from "../store/inMemoryStore";
import { MockAiProvider } from "./ai/adapters";
import { MockIpfsProvider } from "./ipfs/adapters";
import { MockPaymentAdapter } from "./payment/adapters";
import { AiService } from "./aiService";
import { IndexerService } from "./indexerService";
import { IpfsService } from "./ipfsService";
import { MinterService } from "./minterService";
import { PaymentService } from "./paymentService";
import { PipelineService } from "./pipelineService";
import { PromptBuilderService } from "./promptBuilderService";
import { TrendIngestionService } from "./trendIngestionService";

export interface Services {
  db: InMemoryStore;
  trends: TrendIngestionService;
  prompts: PromptBuilderService;
  ai: AiService;
  ipfs: IpfsService;
  minter: MinterService;
  indexer: IndexerService;
  payment: PaymentService;
  pipeline: PipelineService;
}

export interface CreateServicesOptions {
  forceMock?: boolean;
}

export function createServices(db: InMemoryStore = store, options?: CreateServicesOptions): Services {
  const forceMock = options?.forceMock ?? false;
  const trends = new TrendIngestionService(db);
  const prompts = new PromptBuilderService();
  const ai = forceMock ? new AiService(db, new MockAiProvider()) : new AiService(db);
  const ipfs = forceMock ? new IpfsService(new MockIpfsProvider()) : new IpfsService();
  const minter = forceMock ? new MinterService(db, "mock") : new MinterService(db);
  const indexer = new IndexerService(db);
  const payment = forceMock ? new PaymentService(db, new MockPaymentAdapter()) : new PaymentService(db);
  const pipeline = new PipelineService(db, trends, prompts, ai, ipfs, minter, indexer);

  return {
    db,
    trends,
    prompts,
    ai,
    ipfs,
    minter,
    indexer,
    payment,
    pipeline
  };
}

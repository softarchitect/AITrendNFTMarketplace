import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { config } from "../config";
import { InMemoryStore } from "../store/inMemoryStore";
import { GeneratedAsset, GenerationJob } from "../types";
import { AiProvider, GenericHttpAiProvider, HuggingFaceAiProvider, MockAiProvider } from "./ai/adapters";

export class AiService {
  private readonly provider: AiProvider;

  constructor(
    private readonly db: InMemoryStore,
    provider?: AiProvider
  ) {
    if (provider) {
      this.provider = provider;
      return;
    }

    if (config.features.mockAi || config.ai.provider === "mock") {
      this.provider = new MockAiProvider();
      return;
    }

    if (!config.ai.apiKey) {
      throw new Error("AI provider enabled but AI_API_KEY is missing.");
    }

    if (config.ai.provider === "huggingface") {
      this.provider = new HuggingFaceAiProvider(
        config.ai.apiKey,
        config.ai.hfModelId,
        config.ai.imageWidth,
        config.ai.imageHeight,
        config.ai.apiBaseUrl,
        config.ai.hfModelPathPrefix
      );
      return;
    }

    if (!config.ai.apiBaseUrl) {
      throw new Error("Generic AI provider enabled but AI_API_BASE_URL is missing.");
    }

    this.provider = new GenericHttpAiProvider(config.ai.apiBaseUrl, config.ai.apiKey, config.ai.generatePath);
  }

  async generateForJob(job: GenerationJob, topic: string): Promise<GeneratedAsset> {
    this.db.updateJob(job.id, { status: "processing" });

    try {
      const result = await this.provider.generateImage(job.prompt);
      const mediaUrl = await this.persistDataUrlImageIfNeeded(result.mediaUrl);
      const asset = this.db.createAsset({
        jobId: job.id,
        topic,
        prompt: job.prompt,
        mediaUrl,
        provider: this.provider.name
      });

      this.db.updateJob(job.id, { status: "completed" });
      return asset;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown AI generation error";
      this.db.updateJob(job.id, { status: "failed", error: message });
      throw error;
    }
  }

  private async persistDataUrlImageIfNeeded(mediaUrl: string): Promise<string> {
    const match = mediaUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      return mediaUrl;
    }

    const mimeType = match[1];
    const base64Payload = match[2];
    if (!mimeType || !base64Payload) {
      return mediaUrl;
    }

    const extension = mimeTypeToExtension(mimeType);
    const fileName = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.${extension}`;
    const generatedDir = path.resolve(process.cwd(), "generated");
    const filePath = path.join(generatedDir, fileName);

    await mkdir(generatedDir, { recursive: true });
    await writeFile(filePath, Buffer.from(base64Payload, "base64"));

    return `${config.publicBaseUrl}/generated/${fileName}`;
  }
}

function mimeTypeToExtension(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("gif")) return "gif";
  return "png";
}

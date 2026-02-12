import { createHash } from "crypto";

export interface AiProvider {
  name: string;
  generateImage(prompt: string): Promise<{ mediaUrl: string }>;
}

export class MockAiProvider implements AiProvider {
  public readonly name = "mock-ai";

  async generateImage(prompt: string): Promise<{ mediaUrl: string }> {
    const promptHash = createHash("sha256").update(prompt).digest("hex").slice(0, 16);
    return {
      mediaUrl: `https://mock-ai.local/assets/${promptHash}.png`
    };
  }
}

export class GenericHttpAiProvider implements AiProvider {
  public readonly name: string;

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly generatePath: string,
    providerName = "generic-ai"
  ) {
    this.name = providerName;
  }

  async generateImage(prompt: string): Promise<{ mediaUrl: string }> {
    const response = await fetch(`${this.baseUrl}${this.generatePath}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        prompt
      })
    });

    if (!response.ok) {
      throw new Error(`AI generation failed with status ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const mediaUrl =
      (payload.mediaUrl as string | undefined) ??
      (payload.imageUrl as string | undefined) ??
      (payload.url as string | undefined);

    if (!mediaUrl) {
      throw new Error("AI provider response missing media URL");
    }
    return { mediaUrl };
  }
}

export class HuggingFaceAiProvider implements AiProvider {
  public readonly name = "huggingface";

  constructor(
    private readonly apiKey: string,
    private readonly modelId: string,
    private readonly width: number,
    private readonly height: number,
    private readonly baseUrl = "https://router.huggingface.co",
    private readonly modelPathPrefix = "/hf-inference/models"
  ) {}

  async generateImage(prompt: string): Promise<{ mediaUrl: string }> {
    const endpoint = `${this.baseUrl.replace(/\/$/, "")}${normalizePath(
      this.modelPathPrefix
    )}/${encodeURIComponent(this.modelId)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
        accept: "image/png"
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          width: sanitizeDimension(this.width),
          height: sanitizeDimension(this.height)
        }
      })
    });

    if (!response.ok) {
      let details = "";
      try {
        const errorPayload = (await response.json()) as Record<string, unknown>;
        details = ` - ${String(errorPayload.error ?? errorPayload.message ?? "")}`;
      } catch {
        // ignore parse errors and return status-only message
      }
      throw new Error(`Hugging Face generation failed with status ${response.status}${details}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as Record<string, unknown>;
      throw new Error(`Hugging Face returned JSON instead of image: ${String(payload.error ?? "unknown response")}`);
    }

    const imageBytes = Buffer.from(await response.arrayBuffer());
    const base64 = imageBytes.toString("base64");
    return {
      mediaUrl: `data:image/png;base64,${base64}`
    };
  }
}

function sanitizeDimension(input: number): number {
  const min = 256;
  const max = 2048;
  const rounded = Math.round(input / 64) * 64;
  return Math.min(max, Math.max(min, rounded));
}

function normalizePath(pathLike: string): string {
  const cleaned = pathLike.trim().replace(/\/+$/, "");
  return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
}

import { TrendTopic } from "../types";

export class PromptBuilderService {
  buildPrompt(topic: TrendTopic): string {
    const styleHint = topic.pinned
      ? "commissioned premium editorial style"
      : "highly shareable social-trend style";

    return [
      "Generate an original NFT-ready image.",
      `Theme: ${topic.topic}.`,
      `Style: ${styleHint}.`,
      "Constraints: high detail, no watermark, no text overlay, square composition."
    ].join(" ");
  }
}

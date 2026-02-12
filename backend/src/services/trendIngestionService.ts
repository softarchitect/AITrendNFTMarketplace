import { config } from "../config";
import { InMemoryStore } from "../store/inMemoryStore";
import { TrendTopic } from "../types";

const DEFAULT_SIMULATED_TOPICS = [
  "UAE smart city innovation",
  "desert future architecture",
  "AI-assisted calligraphy",
  "sustainable fashion week",
  "space economy in MENA"
];

export class TrendIngestionService {
  constructor(private readonly db: InMemoryStore) {}

  setSources(sources: string[]): string[] {
    this.db.trendSources.clear();
    sources.forEach((source) => this.db.trendSources.add(source.toLowerCase()));
    return [...this.db.trendSources];
  }

  getSources(): string[] {
    return [...this.db.trendSources];
  }

  setPinnedThemes(themes: string[]): string[] {
    this.db.pinnedThemes.clear();
    themes.forEach((theme) => this.db.pinnedThemes.add(theme.trim()));
    return [...this.db.pinnedThemes];
  }

  getPinnedThemes(): string[] {
    return [...this.db.pinnedThemes];
  }

  canMintNow(): { ok: boolean; reason?: string } {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const hour = now.toISOString().slice(0, 13);

    if (this.db.mintCounters.date !== date) {
      this.db.mintCounters = { date, perDay: 0, perHour: {} };
    }

    const hourCount = this.db.mintCounters.perHour[hour] ?? 0;

    if (this.db.mintCounters.perDay >= config.mintCapPerDay) {
      return { ok: false, reason: "Daily mint cap reached" };
    }

    if (hourCount >= config.mintCapPerHour) {
      return { ok: false, reason: "Hourly mint cap reached" };
    }

    return { ok: true };
  }

  incrementMintCounters(): void {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const hour = now.toISOString().slice(0, 13);

    if (this.db.mintCounters.date !== date) {
      this.db.mintCounters = { date, perDay: 0, perHour: {} };
    }

    this.db.mintCounters.perDay += 1;
    this.db.mintCounters.perHour[hour] = (this.db.mintCounters.perHour[hour] ?? 0) + 1;
  }

  ingestSimulatedTrends(limit = 3): TrendTopic[] {
    const output: TrendTopic[] = [];

    for (const theme of this.db.pinnedThemes) {
      output.push(
        this.db.createTrend({
          source: "manual",
          topic: theme,
          score: 100,
          pinned: true
        })
      );
    }

    const sources = [...this.db.trendSources];
    for (let i = 0; i < limit; i += 1) {
      const source = sources[i % sources.length] as TrendTopic["source"];
      const topic = DEFAULT_SIMULATED_TOPICS[i % DEFAULT_SIMULATED_TOPICS.length];
      output.push(
        this.db.createTrend({
          source,
          topic,
          score: 80 - i * 5,
          pinned: false
        })
      );
    }

    return output;
  }
}

import { config } from "../config";
import { AdminThemeRecord, AdminThemeType, InMemoryStore } from "../store/inMemoryStore";
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
    return this.db.replaceTrendSources(sources);
  }

  getSources(): string[] {
    return [...this.db.trendSources];
  }

  getSourceStatuses(): Array<{ source: string; status: "Active" | "Paused" }> {
    return this.db.getTrendSourceStatuses();
  }

  getSourceSettings(): Array<{
    source: string;
    status: "Active" | "Paused";
    rateLimitMode: "Standard" | "Aggressive" | "Conservative";
  }> {
    return this.db.getTrendSourceSettings();
  }

  setPinnedThemes(themes: string[]): string[] {
    return this.db.replacePinnedThemes(themes);
  }

  getPinnedThemes(): string[] {
    return [...this.db.pinnedThemes];
  }

  getThemes(): AdminThemeRecord[] {
    return this.db.listThemes();
  }

  createTheme(input: {
    name: string;
    type: AdminThemeType;
    description?: string;
    active?: boolean;
    priority?: number;
  }): AdminThemeRecord {
    return this.db.createTheme(input);
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
    return this.db.updateTheme(id, patch);
  }

  deleteTheme(id: string): boolean {
    return this.db.deleteTheme(id);
  }

  canMintNow(): { ok: boolean; reason?: string } {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const hour = now.toISOString().slice(0, 13);

    if (this.db.mintCounters.date !== date) {
      this.db.mintCounters = { date, perDay: 0, perHour: {} };
      this.db.touch();
    }

    const hourCount = this.db.mintCounters.perHour[hour] ?? 0;

    const dailyCap = this.db.adminControls.dailyCap || config.mintCapPerDay;
    const hourlyCap = this.db.adminControls.hourlyCap || config.mintCapPerHour;

    if (!this.db.adminControls.scheduleEnabled) {
      return { ok: false, reason: "Mint schedule is disabled" };
    }

    if (this.db.mintCounters.perDay >= dailyCap) {
      return { ok: false, reason: "Daily mint cap reached" };
    }

    if (hourCount >= hourlyCap) {
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
    this.db.touch();
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
    const rotationSeed = (this.db.mintCounters.perDay + this.db.trends.size) % DEFAULT_SIMULATED_TOPICS.length;
    for (let i = 0; i < limit; i += 1) {
      const source = sources[(rotationSeed + i) % Math.max(1, sources.length)] as TrendTopic["source"];
      const topic = DEFAULT_SIMULATED_TOPICS[(rotationSeed + i) % DEFAULT_SIMULATED_TOPICS.length];
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

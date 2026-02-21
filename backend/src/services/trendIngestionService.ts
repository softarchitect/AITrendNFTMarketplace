import { config } from "../config";
import { AdminThemeRecord, AdminThemeType, InMemoryStore } from "../store/inMemoryStore";
import { TrendTopic } from "../types";
import {
  GoogleTrendsAdapter,
  MockTrendAdapter,
  RedditTrendAdapter,
  TrendCandidate,
  TrendSourceAdapter,
  TwitterTrendAdapter
} from "./trends/adapters";

const DEFAULT_SIMULATED_TOPICS = [
  "UAE smart city innovation",
  "desert future architecture",
  "AI-assisted calligraphy",
  "sustainable fashion week",
  "space economy in MENA"
];

export class TrendIngestionService {
  private readonly adapters = new Map<string, TrendSourceAdapter>();
  private readonly mockAdapters = new Map<string, MockTrendAdapter>();
  private readonly sourceHealth = new Map<
    string,
    {
      source: string;
      lastAttemptAt?: string;
      lastSuccessAt?: string;
      consecutiveFailures: number;
      lastError?: string;
    }
  >();

  constructor(private readonly db: InMemoryStore) {}

  registerAdapter(adapter: TrendSourceAdapter): void {
    this.adapters.set(adapter.source.toLowerCase(), adapter);
  }

  registerDefaultAdapters(): void {
    this.registerAdapter(new TwitterTrendAdapter());
    this.registerAdapter(new RedditTrendAdapter());
    this.registerAdapter(new GoogleTrendsAdapter());
  }

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

  getSourceHealth(): Array<{
    source: string;
    lastAttemptAt?: string;
    lastSuccessAt?: string;
    consecutiveFailures: number;
    lastError?: string;
  }> {
    return [...this.sourceHealth.values()].sort((a, b) => a.source.localeCompare(b.source));
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

  private getMockAdapter(source: string): MockTrendAdapter {
    const normalized = source.toLowerCase();
    const existing = this.mockAdapters.get(normalized);
    if (existing) return existing;
    const adapter = new MockTrendAdapter(
      normalized === "twitter" || normalized === "instagram" || normalized === "reddit" || normalized === "googletrends"
        ? normalized
        : "manual"
    );
    this.mockAdapters.set(normalized, adapter);
    return adapter;
  }

  private markSourceAttempt(source: string): void {
    const current = this.sourceHealth.get(source) ?? { source, consecutiveFailures: 0 };
    this.sourceHealth.set(source, {
      ...current,
      source,
      lastAttemptAt: new Date().toISOString()
    });
  }

  private markSourceSuccess(source: string): void {
    const current = this.sourceHealth.get(source) ?? { source, consecutiveFailures: 0 };
    this.sourceHealth.set(source, {
      ...current,
      source,
      lastSuccessAt: new Date().toISOString(),
      consecutiveFailures: 0,
      lastError: undefined
    });
  }

  private markSourceFailure(source: string, error: string): void {
    const current = this.sourceHealth.get(source) ?? { source, consecutiveFailures: 0 };
    this.sourceHealth.set(source, {
      ...current,
      source,
      consecutiveFailures: current.consecutiveFailures + 1,
      lastError: error
    });
  }

  private dedupeCandidates(candidates: TrendCandidate[]): TrendCandidate[] {
    const merged = new Map<string, TrendCandidate>();
    for (const item of candidates) {
      const key = item.topic.trim().toLowerCase();
      if (!key) continue;
      const current = merged.get(key);
      if (!current || item.score > current.score) {
        merged.set(key, item);
      }
    }
    return [...merged.values()].sort((a, b) => b.score - a.score);
  }

  async ingestLiveTrends(limit = config.trends.fetchLimit): Promise<TrendTopic[]> {
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

    const sourceSettings = this.db
      .getTrendSourceSettings()
      .filter((entry) => entry.status === "Active")
      .map((entry) => entry.source.toLowerCase());

    const fetchLimit = Math.max(1, Math.min(50, limit));
    const allCandidates: TrendCandidate[] = [];
    for (const source of sourceSettings) {
      this.markSourceAttempt(source);
      const adapter = this.adapters.get(source);
      const fallbackAdapter = this.getMockAdapter(source);
      try {
        const adapterCandidates = adapter
          ? await adapter.fetchTrends(fetchLimit)
          : await fallbackAdapter.fetchTrends(fetchLimit);
        const candidates = adapterCandidates.length > 0 ? adapterCandidates : await fallbackAdapter.fetchTrends(fetchLimit);
        this.markSourceSuccess(source);
        allCandidates.push(...candidates);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "source fetch failed";
        this.markSourceFailure(source, errorMessage);
        const fallbackCandidates = await fallbackAdapter.fetchTrends(fetchLimit);
        allCandidates.push(...fallbackCandidates);
      }
    }

    const distinctCandidates = this.dedupeCandidates(allCandidates).slice(0, fetchLimit);
    for (const candidate of distinctCandidates) {
      output.push(
        this.db.createTrend({
          source: candidate.source,
          topic: candidate.topic,
          score: candidate.score,
          pinned: false
        })
      );
    }

    if (output.length === 0) {
      return this.ingestSimulatedTrends(fetchLimit);
    }
    return output;
  }

  async ingestTrends(limit = config.trends.fetchLimit): Promise<TrendTopic[]> {
    const fetchLimit = Math.max(1, Math.min(50, limit));
    return this.ingestLiveTrends(fetchLimit);
  }

  getRecentTopics(limit = 10): TrendTopic[] {
    const max = Math.max(1, Math.min(50, limit));
    const ordered = [...this.db.trends.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const deduped: TrendTopic[] = [];
    const seen = new Set<string>();
    for (const item of ordered) {
      const key = item.topic.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      deduped.push(item);
      seen.add(key);
      if (deduped.length >= max) break;
    }
    return deduped;
  }

  syncTrendingThemesFromTopics(topics: TrendTopic[], limit: number): AdminThemeRecord[] {
    const maxThemes = Math.max(1, Math.min(10, limit));
    const selectedNames = Array.from(
      new Set(
        topics
          .filter((item) => !item.pinned)
          .map((item) => item.topic.trim())
          .filter((name) => name.length > 0)
      )
    ).slice(0, maxThemes);
    if (selectedNames.length === 0) {
      return this.getThemes();
    }

    const existingThemes = this.db.listThemes();
    const existingTrending = existingThemes.filter((theme) => theme.type === "Trending");
    const byName = new Map(existingThemes.map((theme) => [theme.name.toLowerCase(), theme]));

    selectedNames.forEach((name, index) => {
      const existing = byName.get(name.toLowerCase());
      if (existing) {
        this.db.updateTheme(existing.id, {
          active: true,
          priority: index + 1,
          type: "Trending",
          description: existing.description || "Auto-synced from trend sources"
        });
        return;
      }
      this.db.createTheme({
        name,
        type: "Trending",
        description: "Auto-synced from trend sources",
        active: true,
        priority: index + 1
      });
    });

    for (const theme of existingTrending) {
      if (!selectedNames.some((name) => name.toLowerCase() === theme.name.toLowerCase())) {
        this.db.updateTheme(theme.id, { active: false });
      }
    }

    return this.getThemes();
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

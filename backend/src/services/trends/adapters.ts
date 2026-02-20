import { config } from "../../config";
import { TrendSource } from "../../types";

export interface TrendCandidate {
  source: TrendSource;
  topic: string;
  score: number;
}

export interface TrendSourceAdapter {
  readonly source: string;
  fetchTrends(limit: number): Promise<TrendCandidate[]>;
}

const DEFAULT_SIMULATED_TOPICS = [
  "UAE smart city innovation",
  "desert future architecture",
  "AI-assisted calligraphy",
  "sustainable fashion week",
  "space economy in MENA"
];

function normalizeTopic(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function scoreFromIndex(index: number): number {
  return Math.max(40, 100 - index * 6);
}

export class MockTrendAdapter implements TrendSourceAdapter {
  public readonly source = "mock";

  constructor(private readonly topicSource: TrendSource = "manual") {}

  async fetchTrends(limit: number): Promise<TrendCandidate[]> {
    const output: TrendCandidate[] = [];
    for (let i = 0; i < limit; i += 1) {
      const topic = DEFAULT_SIMULATED_TOPICS[i % DEFAULT_SIMULATED_TOPICS.length];
      output.push({
        source: this.topicSource,
        topic,
        score: scoreFromIndex(i)
      });
    }
    return output;
  }
}

export class TwitterTrendAdapter implements TrendSourceAdapter {
  public readonly source = "twitter";

  async fetchTrends(limit: number): Promise<TrendCandidate[]> {
    if (!config.trends.twitterBearerToken) return [];
    const maxResults = Math.max(10, Math.min(100, limit * 4));
    const url =
      `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent("(UAE OR NFT OR web3) -is:retweet lang:en")}` +
      `&max_results=${maxResults}&tweet.fields=public_metrics,created_at`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.trends.twitterBearerToken}`
      }
    });
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as {
      data?: Array<{ text?: string; public_metrics?: { like_count?: number; retweet_count?: number } }>;
    };
    const candidates = (payload.data ?? [])
      .map((item, index) => {
        const text = normalizeTopic((item.text ?? "").slice(0, 120));
        if (!text) return undefined;
        const engagement =
          Number(item.public_metrics?.like_count ?? 0) + Number(item.public_metrics?.retweet_count ?? 0);
        return {
          source: "twitter" as const,
          topic: text,
          score: Math.max(scoreFromIndex(index), Math.min(100, 50 + engagement))
        };
      })
      .filter((item): item is Exclude<typeof item, undefined> => item !== undefined);
    return candidates.slice(0, limit);
  }
}

export class RedditTrendAdapter implements TrendSourceAdapter {
  public readonly source = "reddit";

  async fetchTrends(limit: number): Promise<TrendCandidate[]> {
    const url = `https://www.reddit.com/r/popular/hot.json?limit=${Math.max(10, limit * 3)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": config.trends.redditUserAgent
      }
    });
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as {
      data?: { children?: Array<{ data?: { title?: string; score?: number } }> };
    };
    const rows = payload.data?.children ?? [];
    const result = rows
      .map((entry, index) => {
        const title = normalizeTopic((entry.data?.title ?? "").slice(0, 120));
        if (!title) return undefined;
        const rawScore = Number(entry.data?.score ?? 0);
        return {
          source: "reddit" as const,
          topic: title,
          score: Math.max(scoreFromIndex(index), Math.min(100, 45 + Math.floor(rawScore / 50)))
        };
      })
      .filter((item): item is Exclude<typeof item, undefined> => item !== undefined);
    return result.slice(0, limit);
  }
}

export class GoogleTrendsAdapter implements TrendSourceAdapter {
  public readonly source = "googletrends";

  async fetchTrends(limit: number): Promise<TrendCandidate[]> {
    if (!config.trends.googleTrendsApiBaseUrl || !config.trends.googleTrendsApiKey) return [];
    const response = await fetch(
      `${config.trends.googleTrendsApiBaseUrl.replace(/\/$/, "")}/trends?limit=${Math.max(1, limit)}`,
      {
        headers: {
          Authorization: `Bearer ${config.trends.googleTrendsApiKey}`
        }
      }
    );
    if (!response.ok) return [];
    const payload = (await response.json()) as {
      topics?: Array<{ topic?: string; score?: number }>;
    };
    return (payload.topics ?? [])
      .map((item, index) => {
        const topic = normalizeTopic(item.topic ?? "");
        if (!topic) return undefined;
        return {
          source: "googletrends" as const,
          topic,
          score: Math.max(scoreFromIndex(index), Math.min(100, Number(item.score ?? 60)))
        };
      })
      .filter((item): item is Exclude<typeof item, undefined> => item !== undefined)
      .slice(0, limit);
  }
}

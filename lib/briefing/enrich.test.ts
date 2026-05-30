import { describe, expect, it, vi } from "vitest";

import { enrichStoriesWithSummaries, type EnrichDeps } from "@/lib/briefing/enrich";
import type { RankedStory, SportsUpdate } from "@/lib/briefing/types";

function story(overrides: Partial<RankedStory> = {}): RankedStory {
  return {
    topic: "business",
    title: "Story",
    summary: "RSS summary",
    source: "Reuters",
    url: "https://example.com/story",
    publishedAt: "2026-04-05T10:00:00Z",
    dedupeKey: "story",
    score: 30,
    whyItMatters: "Why it matters",
    signalOrNoise: "Noise",
    ...overrides,
  };
}

function deps(): EnrichDeps {
  return {
    resolveArticleUrl: vi.fn(async (url: string) => url),
    fetchArticleText: vi.fn(async (url: string) => `body for ${url}`),
    summarizeArticle: vi.fn(async (input) => `AI summary: ${input.title}`),
  };
}

describe("enrichStoriesWithSummaries", () => {
  it("enriches each story while preserving order", async () => {
    const fakeDeps = deps();
    const stories = [
      story({ title: "First", dedupeKey: "first", url: "https://example.com/first" }),
      story({ title: "Second", dedupeKey: "second", url: "https://example.com/second" }),
      story({ title: "Third", dedupeKey: "third", url: "https://example.com/third" }),
    ];

    const enriched = await enrichStoriesWithSummaries(stories, fakeDeps);

    expect(enriched.map((item) => item.title)).toEqual(["First", "Second", "Third"]);
    expect(enriched.map((item) => item.summary)).toEqual([
      "AI summary: First",
      "AI summary: Second",
      "AI summary: Third",
    ]);
  });

  it("passes story fields and fallback summary to dependencies", async () => {
    const fakeDeps = deps();
    const input = story({
      title: "Market update",
      source: "Bloomberg",
      summary: "Original RSS summary",
      url: "https://example.com/market",
    });

    await enrichStoriesWithSummaries([input], fakeDeps);

    expect(fakeDeps.fetchArticleText).toHaveBeenCalledWith("https://example.com/market");
    expect(fakeDeps.summarizeArticle).toHaveBeenCalledWith({
      title: "Market update",
      source: "Bloomberg",
      articleText: "body for https://example.com/market",
      fallback: "Original RSS summary",
    });
  });

  it("resolves the article URL before fetching the body", async () => {
    const fakeDeps = deps();
    fakeDeps.resolveArticleUrl = vi.fn(async () => "https://publisher.example/real-article");
    const input = story({ url: "https://news.google.com/rss/articles/XYZ?oc=5" });

    await enrichStoriesWithSummaries([input], fakeDeps);

    expect(fakeDeps.resolveArticleUrl).toHaveBeenCalledWith(
      "https://news.google.com/rss/articles/XYZ?oc=5",
    );
    expect(fakeDeps.fetchArticleText).toHaveBeenCalledWith("https://publisher.example/real-article");
  });

  it("never throws and keeps the original summary when a dependency fails", async () => {
    const fakeDeps: EnrichDeps = {
      resolveArticleUrl: vi.fn(async (url: string) => url),
      fetchArticleText: vi.fn(async (url: string) => {
        if (url === "https://example.com/fail") {
          throw new Error("fetch failed");
        }

        return `body for ${url}`;
      }),
      summarizeArticle: vi.fn(async (input) => `AI summary: ${input.title}`),
    };
    const stories = [
      story({ title: "Good", summary: "Good RSS", dedupeKey: "good", url: "https://example.com/good" }),
      story({ title: "Bad", summary: "Bad RSS", dedupeKey: "bad", url: "https://example.com/fail" }),
      story({ title: "Also good", summary: "Also RSS", dedupeKey: "also", url: "https://example.com/also" }),
    ];

    await expect(enrichStoriesWithSummaries(stories, fakeDeps)).resolves.toEqual([
      expect.objectContaining({ title: "Good", summary: "AI summary: Good" }),
      expect.objectContaining({ title: "Bad", summary: "Bad RSS" }),
      expect.objectContaining({ title: "Also good", summary: "AI summary: Also good" }),
    ]);
  });

  it("keeps the original summary when the summarizer falls back", async () => {
    const fakeDeps: EnrichDeps = {
      resolveArticleUrl: vi.fn(async (url: string) => url),
      fetchArticleText: vi.fn(async (url: string) => `body for ${url}`),
      summarizeArticle: vi.fn(async (input) => input.fallback),
    };

    const [enriched] = await enrichStoriesWithSummaries(
      [story({ summary: "Original RSS summary" })],
      fakeDeps,
    );

    expect(enriched.summary).toBe("Original RSS summary");
  });

  it("preserves non-summary fields, including sports metadata", async () => {
    const fakeDeps = deps();
    const sportsStory: SportsUpdate = {
      ...story({
        topic: "sports",
        title: "Tennis result",
        dedupeKey: "tennis-result",
        score: 45,
      }),
      sportsArea: "tennis",
      sportsLabel: "Tennis",
    };

    const [enriched] = await enrichStoriesWithSummaries([sportsStory], fakeDeps);

    expect(enriched).toMatchObject({
      title: "Tennis result",
      summary: "AI summary: Tennis result",
      dedupeKey: "tennis-result",
      score: 45,
      sportsArea: "tennis",
      sportsLabel: "Tennis",
    });
  });

  it("returns an empty array without calling dependencies", async () => {
    const fakeDeps = deps();

    await expect(enrichStoriesWithSummaries([], fakeDeps)).resolves.toEqual([]);
    expect(fakeDeps.fetchArticleText).not.toHaveBeenCalled();
    expect(fakeDeps.summarizeArticle).not.toHaveBeenCalled();
  });
});

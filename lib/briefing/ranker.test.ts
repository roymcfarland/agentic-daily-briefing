import { describe, expect, it, vi } from "vitest";

import {
  buildDedupeKey,
  isFreshStory,
  isLowSignal,
  rankStories,
} from "@/lib/briefing/ranker";
import type { StoryCandidate } from "@/lib/briefing/types";

describe("rankStories", () => {
  it("drops duplicate stories in favor of the stronger source", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-02T12:30:00Z"));

    const stories: StoryCandidate[] = [
      {
        topic: "markets",
        title: "Fed signals slower cuts after inflation surprise",
        summary: "Policy makers signaled a slower pace.",
        source: "Reuters",
        url: "https://example.com/reuters-fed",
        publishedAt: "2026-04-02T10:00:00Z",
      },
      {
        topic: "markets",
        title: "Fed signals slower cuts after inflation surprise",
        summary: "A repeated headline from a weaker source.",
        source: "Some Blog",
        url: "https://example.com/blog-fed",
        publishedAt: "2026-04-02T11:00:00Z",
      },
    ];

    const ranked = rankStories(stories);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.source).toBe("Reuters");
    expect(buildDedupeKey(stories[0])).toBe(buildDedupeKey(stories[1]));
    vi.useRealTimers();
  });

  it("filters low-signal items before ranking", () => {
    const story: StoryCandidate = {
      topic: "business",
      title: "Sponsored roundup: what to know this week",
      summary: "A paid post with generic takeaways.",
      source: "Example",
      url: "https://example.com/noise",
    };

    expect(isLowSignal(story)).toBe(true);
    expect(rankStories([story])).toHaveLength(0);
  });

  it("filters stories older than 72 hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T23:00:00Z"));

    const staleStory: StoryCandidate = {
      topic: "ai",
      title: "Older AI infrastructure update",
      summary: "This is outside the freshness window.",
      source: "Reuters",
      url: "https://example.com/older-ai",
      publishedAt: "2026-03-31T21:00:00Z",
    };

    expect(isFreshStory(staleStory, new Date())).toBe(false);
    expect(rankStories([staleStory])).toHaveLength(0);
    vi.useRealTimers();
  });

  it("dedupes near-identical headlines from different sources", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T23:00:00Z"));

    const stories: StoryCandidate[] = [
      {
        topic: "markets",
        title: "Fed signals slower cuts after inflation surprise",
        summary: "Policy makers signaled a slower pace.",
        source: "Reuters",
        url: "https://example.com/reuters-fed-2",
        publishedAt: "2026-04-04T20:00:00Z",
      },
      {
        topic: "markets",
        title: "Fed signals slower rate cuts after inflation surprise",
        summary: "A very similar framing from another source.",
        source: "Some Blog",
        url: "https://example.com/blog-fed-2",
        publishedAt: "2026-04-04T21:00:00Z",
      },
    ];

    const ranked = rankStories(stories);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.source).toBe("Reuters");
    vi.useRealTimers();
  });

  it("prefers decision-relevant AI infrastructure coverage over newsletter-style AI blurbs", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T23:00:00Z"));

    const stories: StoryCandidate[] = [
      {
        topic: "ai",
        title: "OpenAI and Anthropic push enterprise MCP deployments onto new GPU stacks",
        summary: "The rollout affects inference economics, enterprise agent deployments, and model throughput.",
        source: "Semafor",
        url: "https://example.com/semafor-ai",
        publishedAt: "2026-04-04T18:00:00Z",
      },
      {
        topic: "ai",
        title: "The Daily Rundown recaps this week in AI",
        summary: "A roundup of headlines and things to know.",
        source: "The Daily Rundown",
        url: "https://example.com/rundown-ai",
        publishedAt: "2026-04-04T19:00:00Z",
      },
    ];

    const ranked = rankStories(stories);
    expect(ranked[0]?.source).toBe("Semafor");
    expect(ranked[0]?.signalOrNoise).toBe("Signal");
    vi.useRealTimers();
  });

  it("gives CPG startup innovation stories more weight than generic market reports", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T23:00:00Z"));

    const stories: StoryCandidate[] = [
      {
        topic: "cpg-startups",
        title: "Nutrition startup lands retail launch for biotech protein beverage",
        summary: "The company secured distribution and clinical validation ahead of a national rollout.",
        source: "FoodNavigator-USA",
        url: "https://example.com/cpg-strong",
        publishedAt: "2026-04-04T15:00:00Z",
      },
      {
        topic: "cpg-startups",
        title: "CPG market analysis and forecast for 2030",
        summary: "Trends and insights across consumer packaged goods categories.",
        source: "IndexBox",
        url: "https://example.com/cpg-noise",
        publishedAt: "2026-04-04T14:00:00Z",
      },
    ];

    const ranked = rankStories(stories);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.source).toBe("FoodNavigator-USA");
    expect(ranked[0]?.signalOrNoise).toBe("Signal");
    vi.useRealTimers();
  });
});

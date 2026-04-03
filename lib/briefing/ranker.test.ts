import { describe, expect, it, vi } from "vitest";

import { buildDedupeKey, isLowSignal, rankStories } from "@/lib/briefing/ranker";
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
});

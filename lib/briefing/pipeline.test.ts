import { describe, expect, it } from "vitest";

import { selectStoriesForBriefing } from "@/lib/briefing/pipeline";
import type { RankedStory } from "@/lib/briefing/types";

function story(overrides: Partial<RankedStory>): RankedStory {
  return {
    topic: "business",
    title: "Story",
    summary: "Summary",
    source: "Reuters",
    url: "https://example.com/story",
    publishedAt: "2026-04-05T10:00:00Z",
    dedupeKey: "story",
    score: 30,
    whyItMatters: "Why it matters",
    signalOrNoise: "Noise",
    secondOrderEffect: "Second order",
    ...overrides,
  };
}

describe("selectStoriesForBriefing", () => {
  it("avoids filling the feed with a third weak story from the same topic", () => {
    const selected = selectStoriesForBriefing(
      [
        story({ topic: "cannabis", title: "Cannabis 1", dedupeKey: "c1", score: 44, signalOrNoise: "Signal" }),
        story({ topic: "cannabis", title: "Cannabis 2", dedupeKey: "c2", score: 38, signalOrNoise: "Signal" }),
        story({ topic: "cannabis", title: "Cannabis 3", dedupeKey: "c3", score: 28, signalOrNoise: "Noise" }),
        story({ topic: "ai", title: "AI 1", dedupeKey: "a1", score: 36, signalOrNoise: "Signal" }),
        story({ topic: "sports", title: "Sports 1", dedupeKey: "s1", score: 34, signalOrNoise: "Noise" }),
      ],
      5,
    );

    expect(selected.map((item) => item.title)).toEqual(["AI 1", "Cannabis 1", "Sports 1", "Cannabis 2"]);
  });

  it("still allows an extra same-topic story when it is strong enough to be signal", () => {
    const selected = selectStoriesForBriefing(
      [
        story({ topic: "cannabis", title: "Cannabis 1", dedupeKey: "c1", score: 44, signalOrNoise: "Signal" }),
        story({ topic: "cannabis", title: "Cannabis 2", dedupeKey: "c2", score: 39, signalOrNoise: "Signal" }),
        story({ topic: "cannabis", title: "Cannabis 3", dedupeKey: "c3", score: 35, signalOrNoise: "Signal" }),
        story({ topic: "ai", title: "AI 1", dedupeKey: "a1", score: 36, signalOrNoise: "Signal" }),
      ],
      5,
    );

    expect(selected.map((item) => item.title)).toEqual(["AI 1", "Cannabis 1", "Cannabis 2", "Cannabis 3"]);
  });
});

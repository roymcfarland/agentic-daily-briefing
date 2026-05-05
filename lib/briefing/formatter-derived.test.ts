import { describe, expect, it } from "vitest";

import { buildDigestDerived, countTaskNodes } from "@/lib/briefing/formatter-derived";
import type { BriefingDigest } from "@/lib/briefing/types";

describe("formatter-derived", () => {
  it("counts nested blueprint tasks", () => {
    expect(
      countTaskNodes([
        {
          id: 1,
          title: "Root",
          status: "in-progress",
          subtasks: [
            {
              id: 2,
              title: "Child",
              status: "on-deck",
              subtasks: [{ id: 3, title: "Leaf", status: "on-deck", subtasks: [] }],
            },
          ],
        },
      ]),
    ).toBe(3);
  });

  it("summarizes beats, scores, and pulse tone from a digest", () => {
    const digest: BriefingDigest = {
      dateLabel: "Monday",
      warnings: [],
      oneThingToWatch: "w",
      oneThingToIgnore: "i",
      oneContrarianTake: "c",
      taskSummaries: [],
      stories: [
        {
          topic: "ai",
          title: "A",
          summary: "",
          source: "s",
          url: "u",
          dedupeKey: "a",
          score: 40,
          whyItMatters: "y",
          signalOrNoise: "Signal",
          secondOrderEffect: "so",
          publishedAt: new Date().toISOString(),
        },
        {
          topic: "markets",
          title: "B",
          summary: "",
          source: "s",
          url: "u",
          dedupeKey: "b",
          score: 20,
          whyItMatters: "y",
          signalOrNoise: "Noise",
          secondOrderEffect: "so",
        },
      ],
    };

    const d = buildDigestDerived(digest);
    expect(d.beatCount).toBe(2);
    expect(d.maxScore).toBe(40);
    expect(d.avgScore).toBe(30);
    expect(d.unpublishedCount).toBe(1);
    expect(d.pulseSentence).toContain("Balanced Signal and Noise");
  });
});

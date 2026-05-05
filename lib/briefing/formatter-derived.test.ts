import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildDigestDerived,
  countTaskNodes,
  renderDeskFactsLinePlain,
} from "@/lib/briefing/formatter-derived";
import type { BriefingDigest, RankedStory, TaskSummary } from "@/lib/briefing/types";

const baseStory: RankedStory = {
  topic: "ai",
  title: "Model vendors cut inference costs",
  summary: "",
  source: "Reuters",
  url: "https://example.com/ai",
  dedupeKey: "model-vendors-cut-inference-costs",
  score: 40,
  whyItMatters: "Cheaper inference can reset product margins.",
  signalOrNoise: "Signal",
  secondOrderEffect: "More teams ship copilots sooner.",
};

function story(overrides: Partial<RankedStory> = {}): RankedStory {
  return {
    ...baseStory,
    dedupeKey: overrides.dedupeKey ?? `${overrides.topic ?? baseStory.topic}-${overrides.title ?? baseStory.title}`,
    ...overrides,
  };
}

function digest(overrides: Partial<BriefingDigest> = {}): BriefingDigest {
  return {
    dateLabel: "Monday",
    warnings: [],
    oneThingToWatch: "w",
    oneThingToIgnore: "i",
    oneContrarianTake: "c",
    taskSummaries: [],
    stories: [],
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("formatter-derived", () => {
  it("Task 2.1 counts nested blueprint tasks recursively", () => {
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

  it("Task 2.2 summarizes story, signal/noise, and beat counts", () => {
    const d = buildDigestDerived(
      digest({
        stories: [
          story({ topic: "ai", signalOrNoise: "Signal" }),
          story({ topic: "ai", signalOrNoise: "Noise", title: "AI follow-up" }),
          story({ topic: "markets", signalOrNoise: "Signal" }),
        ],
      }),
    );

    expect(d.storyCount).toBe(3);
    expect(d.signalCount).toBe(2);
    expect(d.noiseCount).toBe(1);
    expect(d.beatCount).toBe(2);
  });

  it("Task 2.3 calculates max and rounded average relevance scores", () => {
    const d = buildDigestDerived(
      digest({
        stories: [
          story({ score: 41 }),
          story({ score: 42, title: "Second" }),
          story({ score: 43, title: "Third" }),
        ],
      }),
    );

    expect(d.maxScore).toBe(43);
    expect(d.avgScore).toBe(42);
  });

  it("Task 2.4 separates fresh, missing, and invalid timestamps", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-05T18:00:00.000Z"));

    const d = buildDigestDerived(
      digest({
        stories: [
          story({ publishedAt: "2026-05-05T07:00:00.000Z" }),
          story({ title: "Stale", publishedAt: "2026-05-05T05:59:59.000Z" }),
          story({ title: "Missing timestamp", publishedAt: undefined }),
          story({ title: "Invalid timestamp", publishedAt: "not-a-date" }),
        ],
      }),
    );

    expect(d.fresh12Count).toBe(1);
    expect(d.unpublishedCount).toBe(2);
  });

  it("Task 2.5 totals Blueprint task nodes and areas", () => {
    const taskSummaries: TaskSummary[] = [
      {
        area: "personal",
        headline: "Personal work",
        openItems: 2,
        tasks: [
          {
            id: 1,
            title: "Root",
            status: "in-progress",
            subtasks: [
              { id: 2, title: "Child", status: "on-deck", subtasks: [] },
            ],
          },
        ],
      },
      {
        area: "brightline-labs",
        headline: "Brightline work",
        openItems: 1,
        tasks: [{ id: 3, title: "Solo", status: "on-deck", subtasks: [] }],
      },
    ];

    const d = buildDigestDerived(digest({ taskSummaries }));

    expect(d.blueprintAreas).toBe(2);
    expect(d.blueprintTaskNodes).toBe(3);
  });

  it("Task 2.6 selects the correct pulse sentence for each signal/noise mix", () => {
    expect(buildDigestDerived(digest()).pulseSentence).toContain("No ranked stories");
    expect(
      buildDigestDerived(digest({ stories: [story(), story({ title: "Second" })] }))
        .pulseSentence,
    ).toContain("Everything here reads as Signal");
    expect(
      buildDigestDerived(
        digest({
          stories: [
            story(),
            story({ title: "Second" }),
            story({ title: "Third", signalOrNoise: "Noise" }),
          ],
        }),
      ).pulseSentence,
    ).toContain("Skews Signal-heavy");
    expect(
      buildDigestDerived(
        digest({
          stories: [
            story({ signalOrNoise: "Noise" }),
            story({ title: "Second", signalOrNoise: "Noise" }),
            story({ title: "Third", signalOrNoise: "Signal" }),
          ],
        }),
      ).pulseSentence,
    ).toContain("Skews Noise-heavy");
    expect(
      buildDigestDerived(
        digest({
          stories: [story(), story({ title: "Second", signalOrNoise: "Noise" })],
        }),
      ).pulseSentence,
    ).toContain("Balanced Signal and Noise");
  });

  describe("topStoryPointer selection", () => {
    it("returns null when there are no stories", () => {
      const d = buildDigestDerived(digest());
      expect(d.topStoryPointer).toBeNull();
    });

    it("prefers a Signal story even when a Noise story has a higher score", () => {
      const noise = story({
        title: "High-scoring Noise headline",
        signalOrNoise: "Noise",
        score: 80,
        secondOrderEffect: "Noise framing.",
      });
      const signal = story({
        title: "Signal headline",
        signalOrNoise: "Signal",
        score: 60,
        secondOrderEffect: "Signal framing — what to watch for downstream.",
      });

      // Stories arrive sorted by score desc — Noise 80 first, Signal 60 second.
      const d = buildDigestDerived(digest({ stories: [noise, signal] }));

      expect(d.topStoryPointer).not.toBeNull();
      expect(d.topStoryPointer?.story.title).toBe("Signal headline");
      expect(d.topStoryPointer?.framing).toBe("Signal framing — what to watch for downstream.");
    });

    it("falls back to the highest-scored story when only Noise stories exist", () => {
      const top = story({
        title: "Top Noise pick",
        signalOrNoise: "Noise",
        score: 50,
        secondOrderEffect: "Noise top framing.",
      });
      const lower = story({
        title: "Lower Noise pick",
        signalOrNoise: "Noise",
        score: 25,
        secondOrderEffect: "Noise lower framing.",
      });

      const d = buildDigestDerived(digest({ stories: [top, lower] }));

      expect(d.topStoryPointer).not.toBeNull();
      expect(d.topStoryPointer?.story.title).toBe("Top Noise pick");
      expect(d.topStoryPointer?.framing).toBe("Noise top framing.");
    });

    it("picks the highest-scored Signal among multiple Signal stories", () => {
      const lowSignal = story({
        title: "Lower Signal",
        signalOrNoise: "Signal",
        score: 50,
        secondOrderEffect: "Lower Signal framing.",
      });
      const highSignal = story({
        title: "Higher Signal",
        signalOrNoise: "Signal",
        score: 80,
        secondOrderEffect: "Higher Signal framing.",
      });

      // Stories arrive sorted by score desc — Higher Signal first.
      const d = buildDigestDerived(digest({ stories: [highSignal, lowSignal] }));

      expect(d.topStoryPointer).not.toBeNull();
      expect(d.topStoryPointer?.story.title).toBe("Higher Signal");
      expect(d.topStoryPointer?.framing).toBe("Higher Signal framing.");
    });
  });

  it("Task 2.7 renders the plain desk-facts line with optional story and Blueprint metrics", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-05T18:00:00.000Z"));

    const d = buildDigestDerived(
      digest({
        stories: [
          story({ topic: "ai", score: 40, publishedAt: "2026-05-05T08:00:00.000Z" }),
          story({
            topic: "markets",
            title: "Markets reset expectations",
            score: 20,
            signalOrNoise: "Noise",
          }),
        ],
        taskSummaries: [
          {
            area: "personal",
            headline: "Personal work",
            openItems: 1,
            tasks: [{ id: 1, title: "Root", status: "in-progress", subtasks: [] }],
          },
        ],
      }),
    );

    const separator = " \u00b7 ";
    expect(renderDeskFactsLinePlain(d)).toBe(
      [
        "2 beats represented",
        "peak relevance 40",
        "avg 30",
        "1 fresh (<12h)",
        "1 no timestamp",
        "1 blueprint task tracked",
      ].join(separator),
    );
    expect(renderDeskFactsLinePlain(buildDigestDerived(digest()))).toBe("");
  });
});

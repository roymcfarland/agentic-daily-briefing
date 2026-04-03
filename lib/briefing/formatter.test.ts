import { describe, expect, it } from "vitest";

import { renderBriefingEmail, renderBriefingText } from "@/lib/briefing/formatter";
import type { BriefingDigest } from "@/lib/briefing/types";

const digest: BriefingDigest = {
  dateLabel: "Thursday, April 2",
  taskSummaries: [
    {
      area: "personal",
      headline: "Focus on health admin and two follow-ups",
      openItems: 4,
      blockers: ["Waiting on lab result"],
      priorities: ["Confirm insurance call", "Reply to lender"],
      dueToday: ["Insurance appeal"],
    },
  ],
  stories: [
    {
      topic: "ai",
      title: "Model vendors cut inference costs",
      summary: "Two major providers cut prices for enterprise tiers.",
      source: "Reuters",
      url: "https://example.com/ai",
      dedupeKey: "model vendors cut inference costs",
      score: 42,
      whyItMatters: "Cheaper inference can reset product margins.",
      signalOrNoise: "Signal",
      secondOrderEffect: "More teams ship copilots sooner.",
    },
  ],
  oneThingToWatch: "Watch margin compression in AI software.",
  oneThingToIgnore: "Ignore thin commentary around hype cycles.",
  oneContrarianTake: "Infra providers may benefit more than app-layer winners.",
};

describe("renderBriefingEmail", () => {
  it("renders the required narrative fields", () => {
    const html = renderBriefingEmail(digest);

    expect(html).toContain("What happened:");
    expect(html).toContain("Why it matters:");
    expect(html).toContain("Signal or noise:");
    expect(html).toContain("One possible second-order effect:");
    expect(html).toContain("One thing to watch:");
    expect(html).toContain("One thing to ignore:");
    expect(html).toContain("One possible contrarian take:");
  });

  it("renders a matching plain-text version", () => {
    const text = renderBriefingText(digest);

    expect(text).toContain("Taskflow Snapshot");
    expect(text).toContain("[AI] Model vendors cut inference costs");
    expect(text).toContain("One possible contrarian take:");
  });
});

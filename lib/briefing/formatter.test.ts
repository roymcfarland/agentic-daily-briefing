import { describe, expect, it } from "vitest";

import { renderBriefingEmail, renderBriefingText } from "@/lib/briefing/formatter";
import type { BriefingDigest } from "@/lib/briefing/types";

const digest: BriefingDigest = {
  dateLabel: "Thursday, April 2",
  taskSummaries: [
    {
      area: "personal",
      headline: "Personal: 4 active tasks across 2 parent items",
      openItems: 4,
      tasks: [
        {
          id: 1,
          title: "Confirm insurance call",
          status: "in-progress",
          subtasks: [
            {
              id: 2,
              title: "Upload supporting paperwork",
              status: "on-deck",
              subtasks: [],
            },
          ],
        },
        {
          id: 3,
          title: "Reply to lender",
          status: "on-deck",
          subtasks: [],
        },
      ],
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
    expect(text).toContain("- Confirm insurance call (in-progress)");
    expect(text).toContain("  - Upload supporting paperwork (on-deck)");
    expect(text).toContain("One possible contrarian take:");
  });
});

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
    {
      topic: "sports",
      title: "Denver Broncos adjust offseason plan - ap.com",
      summary: "Denver adds depth and resets camp expectations.",
      source: "ap.com",
      url: "https://example.com/broncos",
      dedupeKey: "denver broncos adjust offseason plan",
      score: 31,
      whyItMatters: "This is useful context if it changes momentum, fan attention, or the near-term storyline around a team or tournament you track.",
      signalOrNoise: "Noise",
      secondOrderEffect: "A small shift in form, injury status, or tournament momentum could change how the next few days play out.",
    },
  ],
  oneThingToWatch: "Watch margin compression in AI software.",
  oneThingToIgnore: "Ignore thin commentary around hype cycles.",
  oneContrarianTake: "Infra providers may benefit more than app-layer winners.",
  warnings: [],
};

describe("renderBriefingEmail", () => {
  it("renders the required narrative fields", () => {
    const html = renderBriefingEmail(digest);

    expect(html).toContain("Daily Digest");
    expect(html).toContain("What happened</strong>");
    expect(html).toContain("Why it matters</strong>");
    expect(html).toContain("Second-order effect</strong>");
    expect(html).toContain("Briefing Feed");
    expect(html).toContain("Denver Broncos adjust offseason plan");
    expect(html).not.toContain("Denver Broncos adjust offseason plan - ap.com");
    expect(html).toContain("Denver Broncos");
    expect(html).toContain(">Signal<");
    expect(html).toContain("One thing to watch:");
    expect(html).toContain("One thing to ignore:");
    expect(html).toContain("One possible contrarian take:");
  });

  it("renders a matching plain-text version", () => {
    const text = renderBriefingText(digest);

    expect(text).toContain("Daily Digest - Thursday, April 2");
    expect(text).toContain("Blueprint Snapshot");
    expect(text).toContain("Briefing Feed");
    expect(text).toContain("[sports] Denver Broncos adjust offseason plan (AP)");
    expect(text).toContain("[AI] Model vendors cut inference costs");
    expect(text).toContain("- Confirm insurance call (in-progress)");
    expect(text).toContain("  - Upload supporting paperwork (on-deck)");
    expect(text).toContain("Signal: Noise");
    expect(text).toContain("One possible contrarian take:");
  });

  it("omits the task section entirely when there are no task summaries", () => {
    const html = renderBriefingEmail({
      ...digest,
      taskSummaries: [],
    });

    expect(html).not.toContain("Blueprint Snapshot");
    expect(html).toContain("Briefing Feed");
  });

  it("removes redundant title echoes from why-it-matters copy", () => {
    const html = renderBriefingEmail({
      ...digest,
      stories: [
        {
          ...digest.stories[0],
          whyItMatters: "Cheaper inference can reset product margins. Two major providers cut prices for enterprise tiers.",
        },
      ],
    });

    expect(html).toContain("Cheaper inference can reset product margins");
    expect(html).not.toContain("Cheaper inference can reset product margins. Two major providers cut prices for enterprise tiers.");
  });

  it("renders a Briefing notes banner in HTML when warnings are present", () => {
    const html = renderBriefingEmail({
      ...digest,
      warnings: ["Tasks unavailable today: Blueprint getDailySummary failed with 404"],
    });

    expect(html).toContain("Briefing notes");
    expect(html).toContain("Tasks unavailable today: Blueprint getDailySummary failed with 404");
  });

  it("includes a Briefing notes section in the plain text body when warnings are present", () => {
    const text = renderBriefingText({
      ...digest,
      warnings: ["Tasks unavailable today: Blueprint getDailySummary failed with 404"],
    });

    expect(text).toContain("Briefing notes:");
    expect(text).toContain("- Tasks unavailable today: Blueprint getDailySummary failed with 404");
  });

  it("omits the Briefing notes section entirely when there are no warnings", () => {
    const html = renderBriefingEmail(digest);
    const text = renderBriefingText(digest);

    expect(html).not.toContain("Briefing notes");
    expect(text).not.toContain("Briefing notes:");
  });

  it("renders the Decision Lens hero card in HTML before the briefing feed", () => {
    const html = renderBriefingEmail(digest);

    expect(html).toContain("Decision Lens");
    const lensIndex = html.indexOf("Decision Lens");
    const feedIndex = html.indexOf("Briefing Feed");
    expect(lensIndex).toBeGreaterThan(-1);
    expect(feedIndex).toBeGreaterThan(-1);
    expect(lensIndex).toBeLessThan(feedIndex);
  });

  it("renders the Decision Lens block in plain text before the briefing feed", () => {
    const text = renderBriefingText(digest);

    const lensIndex = text.indexOf("Decision Lens");
    const feedIndex = text.indexOf("Briefing Feed");
    expect(lensIndex).toBeGreaterThan(-1);
    expect(feedIndex).toBeGreaterThan(-1);
    expect(lensIndex).toBeLessThan(feedIndex);
  });

  it("gives only the first story the Lead Story treatment in HTML", () => {
    const html = renderBriefingEmail(digest);
    const matches = html.match(/Lead Story/g) ?? [];

    expect(matches.length).toBe(1);
    const leadIndex = html.indexOf("Lead Story");
    const firstStoryIndex = html.indexOf("Model vendors cut inference costs");
    const secondStoryIndex = html.indexOf("Denver Broncos");
    expect(leadIndex).toBeLessThan(firstStoryIndex);
    expect(leadIndex).toBeLessThan(secondStoryIndex);
  });

  it("marks the lead story with [LEAD] in plain text and only on the first story", () => {
    const text = renderBriefingText(digest);
    const leadMatches = text.match(/\[LEAD\]/g) ?? [];

    expect(leadMatches.length).toBe(1);
    expect(text).toContain("[LEAD] [AI] Model vendors cut inference costs");
    expect(text).not.toContain("[LEAD] [sports]");
  });

  it("renders a footer with story count and date label in HTML and text", () => {
    const html = renderBriefingEmail(digest);
    const text = renderBriefingText(digest);

    expect(html).toContain("2 stories");
    expect(html).toContain("1 task area");
    expect(html).toContain("Thursday, April 2");
    expect(text).toContain("2 stories · 1 task area · Thursday, April 2");
  });

  it("uses singular pluralization in the footer when only one story is present", () => {
    const html = renderBriefingEmail({
      ...digest,
      stories: [digest.stories[0]],
    });

    expect(html).toContain("1 story");
    expect(html).not.toContain("1 stories");
  });

  it("does not include task counts in the footer when there are no task summaries", () => {
    const html = renderBriefingEmail({
      ...digest,
      taskSummaries: [],
    });

    expect(html).not.toContain("task area");
  });

  it("renders a graceful fallback when the briefing has no stories", () => {
    const html = renderBriefingEmail({
      ...digest,
      stories: [],
    });
    const text = renderBriefingText({
      ...digest,
      stories: [],
    });

    expect(html).toContain("No stories cleared the relevance threshold today.");
    expect(text).toContain("No stories cleared the relevance threshold today.");
  });

  it("places the warnings banner above the Decision Lens for visibility", () => {
    const html = renderBriefingEmail({
      ...digest,
      warnings: ["Tasks unavailable today: Blueprint getDailySummary failed with 404"],
    });

    const warningsIndex = html.indexOf("Briefing notes");
    const lensIndex = html.indexOf("Decision Lens");
    expect(warningsIndex).toBeGreaterThan(-1);
    expect(lensIndex).toBeGreaterThan(-1);
    expect(warningsIndex).toBeLessThan(lensIndex);
  });
});

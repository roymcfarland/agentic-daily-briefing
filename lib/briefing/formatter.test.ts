import { describe, expect, it, vi } from "vitest";

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
    expect(html).toContain(">One thing to watch<");
    expect(html).toContain(">One thing to ignore<");
    expect(html).toContain(">One possible contrarian take<");
    expect(html).not.toContain(">One thing to watch:<");
    expect(html).not.toContain(">One thing to ignore:<");
    expect(html).not.toContain(">One possible contrarian take:<");
  });

  it("sanitizes story links and escapes hostile story content in HTML", () => {
    const html = renderBriefingEmail({
      ...digest,
      stories: [
        {
          ...digest.stories[0],
          title: `Hostile <script>alert(1)</script> " & title`,
          summary: `Hostile <script>alert(1)</script> " & summary`,
          url: "javascript:alert(document.cookie)",
          whyItMatters: `Hostile <script>alert(1)</script> " & why it matters`,
          secondOrderEffect: `Hostile <script>alert(1)</script> " & second order`,
        },
      ],
    });

    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain("<script>");
    expect(html).toContain('href="#"');
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
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
    expect(text).toContain("If you only read one thing:");
    expect(text).toContain("peak relevance 42");
    expect(text).toContain("Relevance score: 42");
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
    // Search within the Briefing Feed section so the early "If you only read
    // one thing" pointer (which echoes the lead title) doesn't trip the order assertion.
    const feedIndex = html.indexOf("Briefing Feed");
    expect(feedIndex).toBeGreaterThan(-1);
    const feedHtml = html.slice(feedIndex);
    const leadIndex = feedHtml.indexOf("Lead Story");
    const firstStoryIndex = feedHtml.indexOf("Model vendors cut inference costs");
    const secondStoryIndex = feedHtml.indexOf("Denver Broncos");
    expect(leadIndex).toBeGreaterThan(-1);
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

  it("ships editorial-dashboard hooks: dark-mode media query, scoreboard counts, and data-role anchors", () => {
    const html = renderBriefingEmail(digest);

    expect(html).toContain("prefers-color-scheme: dark");
    expect(html).toContain('data-role="canvas"');
    expect(html).toContain('data-role="surface"');
    // Scoreboard anchors the masthead with display-weight tile values (40px numerals).
    expect(html).toMatch(/font-size:40px[^>]*>\s*2\s*</);
    expect(html).toContain("Stories");
    expect(html).toContain("Task areas");
    expect(html).toContain("Open items");
    expect(html).toContain("If you only read one thing");
    expect(html).toContain("peak relevance 42");
  });

  it("omits Task areas and Open items scoreboard tiles when task summaries are empty", () => {
    const html = renderBriefingEmail({
      ...digest,
      taskSummaries: [],
    });

    expect(html).not.toContain("Task areas");
    expect(html).not.toContain("Open items");
  });

  it("renders a green freshness dot when publishedAt is within the last 12 hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-05T18:00:00.000Z"));
    const html = renderBriefingEmail({
      ...digest,
      stories: [
        {
          ...digest.stories[0],
          publishedAt: "2026-05-05T08:00:00.000Z",
        },
        digest.stories[1],
      ],
    });
    vi.useRealTimers();

    expect(html).toContain("background-color:#5a8069");
  });

  it('places the highest-scored Signal story inside the "If you only read one thing" aside in HTML', () => {
    const html = renderBriefingEmail({
      ...digest,
      stories: [
        {
          topic: "ai",
          title: "Signal headline of the day",
          summary: "A signal-bearing development.",
          source: "Reuters",
          url: "https://example.com/signal",
          dedupeKey: "signal-headline-of-the-day",
          score: 60,
          whyItMatters: "Could shift product roadmaps.",
          signalOrNoise: "Signal",
          secondOrderEffect: "Teams accelerate ship cycles to capture the move.",
        },
        {
          topic: "markets",
          title: "Noise headline that ranked lower",
          summary: "Background market chatter.",
          source: "ap.com",
          url: "https://example.com/noise",
          dedupeKey: "noise-headline-that-ranked-lower",
          score: 40,
          whyItMatters: "Texture, not a decision driver.",
          signalOrNoise: "Noise",
          secondOrderEffect: "Marginal effect on positioning.",
        },
      ],
    });

    const asideLabelIndex = html.indexOf("If you only read one thing");
    expect(asideLabelIndex).toBeGreaterThan(-1);
    const asideEnd = html.indexOf("</aside>", asideLabelIndex);
    expect(asideEnd).toBeGreaterThan(asideLabelIndex);

    const asideBlock = html.slice(asideLabelIndex, asideEnd);
    expect(asideBlock).toContain("Signal headline of the day");
    expect(asideBlock).toContain("Teams accelerate ship cycles to capture the move.");
    expect(asideBlock).not.toContain("Noise headline that ranked lower");
  });

  it('omits the "If you only read one thing" section entirely when stories is empty', () => {
    const html = renderBriefingEmail({ ...digest, stories: [] });
    const text = renderBriefingText({ ...digest, stories: [] });

    expect(html).not.toContain("If you only read one thing");
    expect(text).not.toContain("If you only read one thing");
  });

  it("falls back to the highest-scored Noise story when no Signal exists", () => {
    const html = renderBriefingEmail({
      ...digest,
      stories: [
        {
          topic: "markets",
          title: "Top Noise pick of the day",
          summary: "Noise but the loudest one.",
          source: "ap.com",
          url: "https://example.com/noise-top",
          dedupeKey: "top-noise-pick-of-the-day",
          score: 55,
          whyItMatters: "Helpful texture.",
          signalOrNoise: "Noise",
          secondOrderEffect: "Watch for follow-on commentary in the next news cycle.",
        },
        {
          topic: "markets",
          title: "Lower Noise headline",
          summary: "Background.",
          source: "ap.com",
          url: "https://example.com/noise-low",
          dedupeKey: "lower-noise-headline",
          score: 30,
          whyItMatters: "Marginal.",
          signalOrNoise: "Noise",
          secondOrderEffect: "Negligible.",
        },
      ],
    });

    const asideLabelIndex = html.indexOf("If you only read one thing");
    expect(asideLabelIndex).toBeGreaterThan(-1);
    const asideEnd = html.indexOf("</aside>", asideLabelIndex);
    const asideBlock = html.slice(asideLabelIndex, asideEnd);
    expect(asideBlock).toContain("Top Noise pick of the day");
    expect(asideBlock).toContain("Watch for follow-on commentary in the next news cycle.");
  });

  it("strips trailing colons from Decision Lens labels in HTML while leaving plain text colons intact", () => {
    const html = renderBriefingEmail(digest);
    const text = renderBriefingText(digest);

    expect(html).toContain(">One thing to watch<");
    expect(html).toContain(">One thing to ignore<");
    expect(html).toContain(">One possible contrarian take<");
    expect(html).not.toContain(">One thing to watch:<");
    expect(html).not.toContain(">One thing to ignore:<");
    expect(html).not.toContain(">One possible contrarian take:<");

    expect(text).toContain("One thing to watch:");
    expect(text).toContain("One thing to ignore:");
    expect(text).toContain("One possible contrarian take:");
  });

  it("frames the lead story article as a hero card with a 4px accent left border", () => {
    const html = renderBriefingEmail(digest);
    const leadChipIndex = html.indexOf("Lead Story");
    expect(leadChipIndex).toBeGreaterThan(-1);

    // Walk back from the Lead Story chip to the opening <article ...> tag.
    const articleOpen = html.lastIndexOf("<article", leadChipIndex);
    expect(articleOpen).toBeGreaterThan(-1);
    const articleEnd = html.indexOf(">", articleOpen);
    const articleTag = html.slice(articleOpen, articleEnd + 1);

    expect(articleTag).toContain("border-left:4px solid");
  });

  it("differentiates the lead-story data-role hook so the dark-mode rule preserves the hero accent border", () => {
    const html = renderBriefingEmail(digest);

    // Lead article uses the dedicated hero-surface hook.
    const leadChipIndex = html.indexOf("Lead Story");
    const leadArticleOpen = html.lastIndexOf("<article", leadChipIndex);
    const leadArticleEnd = html.indexOf(">", leadArticleOpen);
    const leadArticleTag = html.slice(leadArticleOpen, leadArticleEnd + 1);
    expect(leadArticleTag).toContain('data-role="hero-surface"');
    expect(leadArticleTag).not.toContain('data-role="surface"');

    // Feed (non-lead) article still uses the generic surface hook and never
    // adopts the hero-surface role.
    const feedTitleIndex = html.indexOf("Denver Broncos adjust offseason plan");
    expect(feedTitleIndex).toBeGreaterThan(-1);
    const feedArticleOpen = html.lastIndexOf("<article", feedTitleIndex);
    const feedArticleEnd = html.indexOf(">", feedArticleOpen);
    const feedArticleTag = html.slice(feedArticleOpen, feedArticleEnd + 1);
    expect(feedArticleTag).toContain('data-role="surface"');
    expect(feedArticleTag).not.toContain('data-role="hero-surface"');
  });

  it("sets the lead-story title to 30px and leaves feed-story titles at 17px", () => {
    const html = renderBriefingEmail(digest);

    expect(html).toMatch(/font-size:30px[^>]*>\s*<a[^>]*>Model vendors cut inference costs</);
    expect(html).toMatch(/font-size:17px[^>]*>\s*<a[^>]*>Denver Broncos adjust offseason plan</);
  });
});

import { writeFileSync } from "node:fs";

import { renderBriefingEmail, renderBriefingText } from "@/lib/briefing/formatter";
import type { BriefingDigest } from "@/lib/briefing/types";

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

/** Representative digest for opening `/tmp/email-preview.html` in a browser — no network or env access. */
const fixture: BriefingDigest = {
  dateLabel: "Tuesday, May 5, 2026",
  warnings: ["Preview fixture only: Blueprint snapshot intentionally degraded for HTML review."],
  oneThingToWatch: "Watch whether distributor payment terms slip another week.",
  oneThingToIgnore: "Ignore hot takes on model release timing that lack customer proof.",
  oneContrarianTake: "Operators who standardize on boring compliance win the next funding cycle.",
  taskSummaries: [
    {
      area: "personal",
      headline: "Personal: insurance, lender replies, and household ops",
      openItems: 3,
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
              subtasks: [
                {
                  id: 201,
                  title: "Scan policy addendum",
                  status: "on-deck",
                  subtasks: [],
                },
              ],
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
    {
      area: "brightline-labs",
      headline: "Beta program: triage incoming bug reports and sync release notes",
      openItems: 5,
      tasks: [
        {
          id: 10,
          title: "Cut beta build for testers",
          status: "in-progress",
          subtasks: [
            {
              id: 11,
              title: "Confirm crash report ingestion is healthy",
              status: "on-deck",
              subtasks: [],
            },
          ],
        },
      ],
    },
  ],
  stories: [
    {
      topic: "ai",
      title: "Model vendors cut inference costs - Reuters",
      summary: "Two major providers cut prices for enterprise tiers.",
      source: "Reuters",
      url: "https://example.com/ai",
      dedupeKey: "model vendors cut inference costs",
      score: 42,
      whyItMatters: "Cheaper inference can reset product margins.",
      signalOrNoise: "Signal",
      secondOrderEffect: "More teams ship copilots sooner.",
      publishedAt: hoursAgo(6),
    },
    {
      topic: "markets",
      title: "Treasury volatility ripples through cash management - FT",
      summary: "Short-duration funds see another week of elevated flows.",
      source: "ft.com",
      url: "https://example.com/markets",
      dedupeKey: "treasury volatility ripples",
      score: 38,
      whyItMatters: "Cash policy this week matters for near-term runway decisions.",
      signalOrNoise: "Noise",
      secondOrderEffect: "A sustained move changes how vendors price annual deals.",
      publishedAt: hoursAgo(20),
    },
    {
      topic: "business",
      title: "Regional grocers tighten private-label terms - WSJ",
      summary: "Buyers push for shorter payment windows on new SKUs.",
      source: "wsj.com",
      url: "https://example.com/business",
      dedupeKey: "regional grocers tighten",
      score: 35,
      whyItMatters: "Shelf economics for emerging CPG tighten at the worst time.",
      signalOrNoise: "Signal",
      secondOrderEffect: "Smaller brands front-load promos or exit slow doors.",
      publishedAt: hoursAgo(80),
    },
    {
      topic: "sports",
      title: "Denver Broncos adjust offseason plan - ap.com",
      summary: "Denver adds depth and resets camp expectations.",
      source: "ap.com",
      url: "https://example.com/broncos",
      dedupeKey: "denver broncos adjust offseason plan",
      score: 31,
      whyItMatters:
        "This is useful context if it changes momentum, fan attention, or the near-term storyline around a team or tournament you track.",
      signalOrNoise: "Noise",
      secondOrderEffect:
        "A small shift in form, injury status, or tournament momentum could change how the next few days play out.",
      publishedAt: hoursAgo(2),
    },
    {
      topic: "asymmetric-upside",
      title: "Small-modular reactor pilot clears another permitting hurdle",
      summary: "A regional utility moves to the construction phase on schedule.",
      source: "apnews.com",
      url: "https://example.com/smr",
      dedupeKey: "smr pilot clears permitting hurdle",
      score: 29,
      whyItMatters: "A working SMR template would reset baseload economics for data-center-heavy regions.",
      signalOrNoise: "Signal",
      secondOrderEffect: "Cheaper, denser baseload changes where the next AI buildout actually lands.",
    },
  ],
};

const htmlOut = "/tmp/email-preview.html";
const textOut = "/tmp/email-preview.txt";

writeFileSync(htmlOut, renderBriefingEmail(fixture), "utf8");
writeFileSync(textOut, renderBriefingText(fixture), "utf8");

console.log(`Wrote ${htmlOut}`);
console.log(`Wrote ${textOut}`);

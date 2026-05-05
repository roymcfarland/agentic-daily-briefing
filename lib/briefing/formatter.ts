import { escapeHtml } from "@/lib/html";
import { buildDigestDerived, renderDeskFactsLinePlain } from "@/lib/briefing/formatter-derived";
import type { BriefingDigest, RankedStory, TaskNode, TaskSummary } from "@/lib/briefing/types";
import { getTopicLabel } from "@/lib/research/topics";

// ============================================================
// Design tokens (single source of truth for email styles)
// ============================================================

const PALETTE = {
  light: {
    canvas: "#f5efe6",
    surface: "#fffdf9",
    surfaceElevated: "#faf8f4",
    ink: "#1c1917",
    inkMuted: "#57534e",
    inkSubtle: "#78716c",
    accent: "#7c331c",
    accentSoft: "#f6f1ea",
    signalBg: "#eef4f0",
    signalFg: "#3f5249",
    signalBorder: "#c9d9cf",
    noiseBg: "#f3f1ee",
    noiseFg: "#57534e",
    noiseBorder: "#ddd9d4",
    divider: "#e8dfd2",
    warningBg: "#faf6ee",
    warningFg: "#624c34",
    warningBorder: "#e8d4b8",
    freshnessGreen: "#5a8069",
    freshnessAmber: "#a67c52",
    freshnessGray: "#a8a29e",
  },
  dark: {
    canvas: "#1c1917",
    surface: "#292524",
    surfaceElevated: "#34302c",
    ink: "#f5f5f4",
    inkMuted: "#a8a29e",
    inkSubtle: "#948f89",
    accent: "#c4956c",
    accentSoft: "#3d3029",
    signalBg: "#2a3530",
    signalFg: "#b8cbc0",
    signalBorder: "#3d4f44",
    noiseBg: "#363330",
    noiseFg: "#d6d3cd",
    noiseBorder: "#57534e",
    divider: "#44403c",
    warningBg: "#3a3128",
    warningFg: "#d6c4a8",
    warningBorder: "#6b5344",
    freshnessGreen: "#7daa8f",
    freshnessAmber: "#c9a87a",
    freshnessGray: "#78716c",
  },
} as const;

const L = PALETTE.light;
const D = PALETTE.dark;

function renderDarkModeStyleBlock(): string {
  return `
    <style type="text/css">
      @media (prefers-color-scheme: dark) {
        [data-role="canvas"] { background-color: ${D.canvas} !important; color: ${D.ink} !important; }
        [data-role="surface"] { background-color: ${D.surface} !important; border-color: ${D.divider} !important; color: ${D.ink} !important; }
        [data-role="ink"] { color: ${D.ink} !important; }
        [data-role="ink-muted"] { color: ${D.inkMuted} !important; }
        [data-role="divider"] { border-color: ${D.divider} !important; background-color: ${D.divider} !important; }
        [data-role="accent"] { color: ${D.accent} !important; background-color: ${D.accentSoft} !important; border-color: ${D.accent} !important; }
        [data-role="signal-chip"] { background-color: ${D.signalBg} !important; color: ${D.signalFg} !important; border-color: ${D.signalBorder} !important; }
        [data-role="noise-chip"] { background-color: ${D.noiseBg} !important; color: ${D.noiseFg} !important; border-color: ${D.noiseBorder} !important; }
        [data-role="warning"] { background-color: ${D.warningBg} !important; border-color: ${D.warningBorder} !important; color: ${D.warningFg} !important; }
        article[data-role="surface"] h3 a { color: ${D.accent} !important; }
      }
    </style>`;
}

function freshnessDotColor(publishedAt: string | undefined): string {
  if (!publishedAt) {
    return L.freshnessGray;
  }
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) {
    return L.freshnessGray;
  }
  const hours = (Date.now() - t) / (1000 * 60 * 60);
  if (hours <= 12) {
    return L.freshnessGreen;
  }
  if (hours <= 48) {
    return L.freshnessAmber;
  }
  return L.freshnessGray;
}

// ============================================================
// Helpers
// ============================================================

function normalizeForComparison(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function trimSentence(value: string): string {
  return value.replace(/\s+/g, " ").trim().replace(/[.\s]+$/, "");
}

function formatSourceLabel(source: string): string {
  const trimmed = source.trim();
  if (!trimmed.includes(".") || trimmed.includes(" ")) {
    return trimmed;
  }

  return trimmed
    .replace(/^www\./i, "")
    .replace(/\.(com|net|org|co|io)$/i, "")
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => (part.length <= 3 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ");
}

function stripSourceSuffix(title: string, source: string): string {
  const trimmedTitle = trimSentence(title);
  const candidates = [
    source,
    source.replace(/^www\./i, ""),
    formatSourceLabel(source),
  ]
    .map(trimSentence)
    .filter(Boolean);

  for (const candidate of candidates) {
    const suffixPatterns = [
      new RegExp(`\\s[-|:]\\s${candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      new RegExp(`\\s[-|:]\\s${candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.com$`, "i"),
    ];

    for (const pattern of suffixPatterns) {
      if (pattern.test(trimmedTitle)) {
        return trimSentence(trimmedTitle.replace(pattern, ""));
      }
    }
  }

  return trimmedTitle;
}

function removeRedundantTail(value: string, repeated: string[]): string {
  let next = trimSentence(value);

  for (const item of repeated.map(trimSentence).filter(Boolean)) {
    const normalizedItem = normalizeForComparison(item);
    if (!normalizedItem) {
      continue;
    }

    const normalizedNext = normalizeForComparison(next);
    if (normalizedNext === normalizedItem) {
      continue;
    }

    if (normalizedNext.endsWith(normalizedItem)) {
      const plainPattern = new RegExp(`${item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
      next = trimSentence(next.replace(plainPattern, ""));
    }
  }

  return next;
}

function getDisplayTitle(story: RankedStory): string {
  return stripSourceSuffix(story.title, story.source);
}

function getWhatHappened(story: RankedStory): string {
  const title = getDisplayTitle(story);
  const summary = trimSentence(story.summary || story.title);
  if (!summary || normalizeForComparison(summary) === normalizeForComparison(title)) {
    return title;
  }

  return summary;
}

function getWhyItMatters(story: RankedStory): string {
  const title = getDisplayTitle(story);
  const summary = getWhatHappened(story);
  const trimmed = removeRedundantTail(story.whyItMatters, [summary, title]);
  return trimmed || story.whyItMatters;
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function sumOpenItems(summaries: TaskSummary[]): number {
  return summaries.reduce((acc, s) => acc + s.openItems, 0);
}

function renderDeskReading(digest: BriefingDigest): string {
  const d = buildDigestDerived(digest);
  if (!d.topStoryPointer) {
    return "";
  }

  const { story, framing } = d.topStoryPointer;
  const displayTitle = getDisplayTitle(story);

  return `
        <aside data-role="canvas" style="margin:0 0 20px;padding:16px 18px;border:1px solid ${L.divider};border-radius:14px;background-color:${L.canvas};">
          <p style="margin:0 0 8px;"><span data-role="accent" style="display:inline-block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${L.accent};font-weight:600;">If you only read one thing</span></p>
          <p data-role="ink-muted" style="margin:0;font-size:15px;line-height:1.55;color:${L.inkMuted};font-style:italic;"><a href="${escapeHtml(story.url)}" style="color:${L.accent};text-decoration:none;">${escapeHtml(displayTitle)}</a> — ${escapeHtml(framing)}</p>
        </aside>`;
}

// ============================================================
// HTML section renderers
// ============================================================

function renderHeader(digest: BriefingDigest): string {
  return `
        <p style="margin:0 0 8px;">
          <span data-role="accent" style="display:inline-block;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${L.accent};">Daily Digest</span>
        </p>
        <h1 data-role="ink" style="margin:0 0 24px;font-size:28px;line-height:1.1;color:${L.ink};font-weight:700;">${escapeHtml(digest.dateLabel)}</h1>`;
}

function renderScoreboard(digest: BriefingDigest): string {
  const derived = buildDigestDerived(digest);
  const storyCount = digest.stories.length;
  const signalCount = digest.stories.filter((s) => s.signalOrNoise === "Signal").length;
  const noiseCount = digest.stories.filter((s) => s.signalOrNoise === "Noise").length;
  const taskAreas = digest.taskSummaries.length;
  const openTotal = sumOpenItems(digest.taskSummaries);

  type Tile = { value: string; label: string };
  const tiles: Tile[] = [
    { value: String(storyCount), label: "Stories" },
    { value: String(signalCount), label: "Signal" },
    { value: String(noiseCount), label: "Noise" },
  ];
  if (taskAreas > 0) {
    tiles.push({ value: String(taskAreas), label: "Task areas" });
  }
  if (openTotal > 0) {
    tiles.push({ value: String(openTotal), label: "Open items" });
  }

  const cells = tiles
    .map((tile, index) => {
      const divider =
        index < tiles.length - 1
          ? `<td data-role="divider" style="width:1px;padding:0;background-color:${L.divider};" aria-hidden="true"></td>`
          : "";
      return `
            <td style="padding:18px 12px;text-align:center;vertical-align:top;">
              <div data-role="ink" style="margin:0 0 6px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:40px;line-height:1.05;font-weight:700;color:${L.ink};">${escapeHtml(tile.value)}</div>
              <div data-role="ink-muted" style="margin:0;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${L.inkMuted};">${escapeHtml(tile.label)}</div>
            </td>${divider}`;
    })
    .join("");

  const metricsPlain = renderDeskFactsLinePlain(derived);
  const metricsRow =
    metricsPlain !== ""
      ? `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;width:100%;border-top:1px solid ${L.divider};">
            <tr>
              <td data-role="ink-muted" style="padding:12px 14px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:12px;line-height:1.65;color:${L.inkMuted};">${escapeHtml(metricsPlain)}</td>
            </tr>
          </table>`
      : "";

  return `
        <div data-role="surface" style="margin:8px 0 28px;padding:0;border:1px solid ${L.divider};border-radius:14px;background-color:${L.surfaceElevated};overflow:hidden;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;width:100%;">
            <tr>
              ${cells}
            </tr>
          </table>
          ${metricsRow}
        </div>`;
}

function renderDecisionLens(digest: BriefingDigest): string {
  const rows: Array<{ label: string; value: string }> = [
    { label: "One thing to watch", value: digest.oneThingToWatch },
    { label: "One thing to ignore", value: digest.oneThingToIgnore },
    { label: "One possible contrarian take", value: digest.oneContrarianTake },
  ];

  const items = rows
    .map((row, index) => {
      const divider =
        index > 0
          ? `<div data-role="divider" style="margin:22px 0;padding:0;height:1px;background-color:${L.divider};line-height:1px;font-size:0;">&nbsp;</div>`
          : "";
      return `
            ${divider}
            <p style="margin:0 0 10px;"><span data-role="accent" style="display:inline-block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${L.accent};font-weight:600;">${escapeHtml(row.label)}</span></p>
            <p data-role="ink" style="margin:0;font-family:Georgia,serif;font-size:20px;line-height:1.4;color:${L.ink};font-weight:400;">${escapeHtml(row.value)}</p>`;
    })
    .join("");

  return `
        <section data-role="surface" style="margin:0 0 24px;padding:32px 24px;border:1px solid ${L.divider};border-left:4px solid ${L.accent};background-color:${L.accentSoft};border-radius:14px;">
          <p style="margin:0 0 22px;"><span data-role="accent" style="display:inline-block;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${L.accent};font-weight:600;">Decision Lens</span></p>
          ${items}
        </section>`;
}

function renderWarningsBanner(warnings: string[]): string {
  if (!warnings.length) {
    return "";
  }

  const items = warnings
    .map((warning) => `<li style="margin:0 0 4px;line-height:1.5;">${escapeHtml(warning)}</li>`)
    .join("");

  return `
        <section data-role="warning" style="margin:0 0 20px;padding:14px 16px;border:1px solid ${L.warningBorder};background-color:${L.warningBg};border-radius:12px;color:${L.warningFg};">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${L.warningFg};font-weight:600;">Briefing notes</p>
          <ul style="margin:0;padding-left:18px;color:${L.warningFg};">${items}</ul>
        </section>`;
}

function renderTaskNodes(tasks: TaskNode[], depth = 0): string {
  if (!tasks.length) {
    return `<p style="margin:0;color:${L.inkSubtle};">No active tasks in this list.</p>`;
  }

  const marginTop = depth === 0 ? "8px" : "6px";
  const pad = depth === 0 ? "12px" : `${12 + depth * 10}px`;
  return `<ul style="margin:${marginTop} 0 0;padding:0 0 0 ${pad};list-style:none;border-left:1px solid ${L.accentSoft};">
    ${tasks
      .map(
        (task) => `
        <li style="margin:0 0 8px;">
          <span data-role="ink" style="color:${L.ink};">${escapeHtml(task.title)}</span>
          <span style="color:${L.inkSubtle};"> (${escapeHtml(task.status)})</span>
          ${task.subtasks.length ? renderTaskNodes(task.subtasks, depth + 1) : ""}
        </li>
      `,
      )
      .join("")}</ul>`;
}

function renderTaskSummary(summary: TaskSummary): string {
  return `
    <section data-role="surface" style="margin:0 0 16px;padding:20px;border:1px solid ${L.divider};border-radius:12px;background-color:${L.surfaceElevated};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin:0 0 8px;">
        <tr>
          <td style="vertical-align:middle;">
            <span data-role="accent" style="display:inline-block;margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:${L.accent};">${escapeHtml(summary.area)}</span>
          </td>
          <td style="vertical-align:middle;text-align:right;white-space:nowrap;">
            <span data-role="surface" style="display:inline-block;margin-left:8px;padding:4px 8px;border-radius:8px;border:1px solid ${L.divider};background-color:${L.canvas};font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:13px;font-weight:600;color:${L.ink};">${escapeHtml(String(summary.openItems))}</span>
            <span data-role="ink-muted" style="margin-left:6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${L.inkMuted};">open</span>
          </td>
        </tr>
      </table>
      <h3 data-role="ink" style="margin:0 0 10px;font-size:18px;line-height:1.2;color:${L.ink};">${escapeHtml(summary.headline)}</h3>
      <p data-role="ink-muted" style="margin:0 0 12px;color:${L.inkMuted};font-size:14px;line-height:1.45;"><strong data-role="ink">${escapeHtml(String(summary.openItems))}</strong> open items</p>
      <p data-role="ink" style="margin:0 0 4px;font-weight:700;color:${L.ink};">Active tasks</p>
      ${renderTaskNodes(summary.tasks)}
    </section>
  `;
}

function renderTaskSection(taskSummaries: TaskSummary[]): string {
  if (!taskSummaries.length) {
    return "";
  }

  return `
        <section style="margin:0 0 24px;">
          <h2 data-role="ink" style="margin:0 0 12px;font-size:22px;line-height:1.2;color:${L.ink};">Blueprint Snapshot</h2>
          ${taskSummaries.map(renderTaskSummary).join("")}
        </section>`;
}

function renderStory(story: RankedStory, options: { isLead: boolean }): string {
  const displayTitle = getDisplayTitle(story);
  const sourceLabel = formatSourceLabel(story.source);
  const chipRole = story.signalOrNoise === "Signal" ? "signal-chip" : "noise-chip";
  const chipBg = story.signalOrNoise === "Signal" ? L.signalBg : L.noiseBg;
  const chipFg = story.signalOrNoise === "Signal" ? L.signalFg : L.noiseFg;
  const chipBorder = story.signalOrNoise === "Signal" ? L.signalBorder : L.noiseBorder;
  const titleSize = options.isLead ? 30 : 17;
  const titleLineHeight = options.isLead ? 1.15 : 1.2;
  const fresh = freshnessDotColor(story.publishedAt);

  const articlePadding = options.isLead ? "32px 28px" : "20px";
  const articleAccentBorder = options.isLead ? `border-left:4px solid ${L.accent};` : "";

  const leadChip = options.isLead
    ? `<div data-role="accent" style="margin:0 0 10px;display:inline-block;padding:6px 12px;border-radius:999px;background-color:${L.accentSoft};border:1px solid ${L.accent};color:${L.accent};font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;">Lead Story</div>`
    : "";

  const storyBodyBlocks = options.isLead
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin:18px 0 0;">
        <tr>
          <td style="padding:0;">
            <p data-role="ink-muted" style="margin:0 0 6px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${L.inkMuted};"><strong>What happened</strong></p>
            <p data-role="ink" style="margin:0;color:${L.ink};line-height:1.5;">${escapeHtml(getWhatHappened(story))}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 0 0;">
            <p data-role="ink-muted" style="margin:0 0 6px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${L.inkMuted};"><strong>Why it matters</strong></p>
            <p data-role="ink" style="margin:0;color:${L.ink};line-height:1.5;">${escapeHtml(getWhyItMatters(story))}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 0 0;">
            <p data-role="ink-muted" style="margin:0 0 6px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${L.inkMuted};"><strong>Second-order effect</strong></p>
            <p data-role="ink" style="margin:0;color:${L.ink};line-height:1.5;">${escapeHtml(story.secondOrderEffect)}</p>
          </td>
        </tr>
      </table>`
    : `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin:14px 0 0;">
        <tr>
          <td data-role="divider" style="padding:0 0 10px;height:1px;background-color:${L.divider};line-height:1px;font-size:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:12px 0 0;">
            <p data-role="ink-muted" style="margin:0 0 6px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${L.inkMuted};"><strong>What happened</strong></p>
            <p data-role="ink" style="margin:0;color:${L.ink};line-height:1.5;">${escapeHtml(getWhatHappened(story))}</p>
          </td>
        </tr>
        <tr>
          <td data-role="divider" style="padding:10px 0 0;height:1px;background-color:${L.divider};line-height:1px;font-size:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:12px 0 0;">
            <p data-role="ink-muted" style="margin:0 0 6px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${L.inkMuted};"><strong>Why it matters</strong></p>
            <p data-role="ink" style="margin:0;color:${L.ink};line-height:1.5;">${escapeHtml(getWhyItMatters(story))}</p>
          </td>
        </tr>
        <tr>
          <td data-role="divider" style="padding:10px 0 0;height:1px;background-color:${L.divider};line-height:1px;font-size:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:12px 0 0;">
            <p data-role="ink-muted" style="margin:0 0 6px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${L.inkMuted};"><strong>Second-order effect</strong></p>
            <p data-role="ink" style="margin:0;color:${L.ink};line-height:1.5;">${escapeHtml(story.secondOrderEffect)}</p>
          </td>
        </tr>
      </table>`;

  return `
    <article data-role="surface" style="margin:0 0 16px;padding:${articlePadding};border:1px solid ${L.divider};${articleAccentBorder}border-radius:12px;background-color:${L.surfaceElevated};">
      ${leadChip}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" data-role="canvas" style="border-collapse:collapse;margin:0;padding:12px 14px;background-color:${L.canvas};border-bottom:1px solid ${L.divider};border-radius:10px;">
        <tr>
          <td style="vertical-align:middle;">
            <p data-role="ink-muted" style="margin:0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${L.inkMuted};">${escapeHtml(getTopicLabel(story.topic))} · ${escapeHtml(sourceLabel)}</p>
          </td>
          <td style="vertical-align:middle;text-align:right;white-space:nowrap;">
            <span data-role="${chipRole}" style="display:inline-block;margin-right:8px;padding:4px 10px;border:1px solid ${chipBorder};border-radius:999px;font-size:11px;font-weight:600;letter-spacing:.05em;background-color:${chipBg};color:${chipFg};">${escapeHtml(story.signalOrNoise)}</span>
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background-color:${fresh};vertical-align:middle;"></span>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding:10px 0 0;">
            <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:11px;line-height:1.45;color:${L.inkMuted};">Relevance score ${escapeHtml(String(story.score))}${story.publishedAt ? "" : " · timestamp pending"}</p>
          </td>
        </tr>
      </table>
      <h3 style="margin:16px 0 8px;font-size:${titleSize}px;line-height:${titleLineHeight};color:${L.ink};font-weight:700;">
        <a href="${escapeHtml(story.url)}" style="color:${L.accent};text-decoration:none;">${escapeHtml(displayTitle)}</a>
      </h3>
      ${storyBodyBlocks}
    </article>`;
}

function renderStoriesSection(stories: RankedStory[]): string {
  if (!stories.length) {
    return `
        <section>
          <h2 data-role="ink" style="margin:0 0 12px;font-size:22px;color:${L.ink};">Briefing Feed</h2>
          <p data-role="ink-muted" style="margin:0;color:${L.inkMuted};">No stories cleared the relevance threshold today.</p>
        </section>`;
  }

  return `
        <section>
          <h2 data-role="ink" style="margin:0 0 12px;font-size:22px;color:${L.ink};">Briefing Feed</h2>
          ${stories.map((story, index) => renderStory(story, { isLead: index === 0 })).join("")}
        </section>`;
}

function renderFooter(digest: BriefingDigest): string {
  const storyLine = pluralize(digest.stories.length, "story", "stories");
  const taskLine = digest.taskSummaries.length
    ? ` · ${pluralize(digest.taskSummaries.length, "task area", "task areas")}`
    : "";

  return `
        <footer style="margin-top:28px;padding-top:16px;border-top:1px solid ${L.divider};" data-role="divider">
          <p data-role="ink-muted" style="margin:0;color:${L.inkMuted};font-size:12px;letter-spacing:.04em;">${escapeHtml(storyLine)}${escapeHtml(taskLine)} · ${escapeHtml(digest.dateLabel)}</p>
        </footer>`;
}

// ============================================================
// Plain-text section helpers
// ============================================================

function appendTaskLines(lines: string[], tasks: TaskNode[], depth = 0) {
  const prefix = `${"  ".repeat(depth)}- `;

  for (const task of tasks) {
    lines.push(`${prefix}${task.title} (${task.status})`);
    appendTaskLines(lines, task.subtasks, depth + 1);
  }
}

// ============================================================
// Public API
// ============================================================

export function renderBriefingEmail(digest: BriefingDigest): string {
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="color-scheme" content="light dark" />
      <meta name="supported-color-schemes" content="light dark" />
      ${renderDarkModeStyleBlock()}
    </head>
    <body data-role="canvas" style="margin:0;padding:24px;background-color:${L.canvas};color:${L.ink};font-family:Georgia,serif;">
      <div data-role="surface" style="max-width:840px;margin:0 auto;background-color:${L.surface};border-radius:24px;padding:28px;border:1px solid ${L.divider};">
        ${renderHeader(digest)}
        ${renderScoreboard(digest)}
        ${renderWarningsBanner(digest.warnings)}
        ${renderDeskReading(digest)}
        ${renderDecisionLens(digest)}
        ${renderTaskSection(digest.taskSummaries)}
        ${renderStoriesSection(digest.stories)}
        ${renderFooter(digest)}
      </div>
    </body>
  </html>
  `;
}

export function renderBriefingText(digest: BriefingDigest): string {
  const lines: string[] = [
    `Daily Digest - ${digest.dateLabel}`,
  ];

  if (digest.warnings.length) {
    lines.push("", "Briefing notes:");
    for (const warning of digest.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  const derivedBlock = buildDigestDerived(digest);
  if (derivedBlock.topStoryPointer) {
    const { story, framing } = derivedBlock.topStoryPointer;
    lines.push("", "If you only read one thing:");
    lines.push(getDisplayTitle(story));
    lines.push(framing);
    lines.push(`Link: ${story.url}`);
  }
  const metricsPlain = renderDeskFactsLinePlain(derivedBlock);
  if (metricsPlain) {
    lines.push(metricsPlain);
  }

  lines.push("", "Decision Lens");
  lines.push(`One thing to watch: ${digest.oneThingToWatch}`);
  lines.push(`One thing to ignore: ${digest.oneThingToIgnore}`);
  lines.push(`One possible contrarian take: ${digest.oneContrarianTake}`);

  if (digest.taskSummaries.length) {
    lines.push("", "Blueprint Snapshot");

    for (const summary of digest.taskSummaries) {
      lines.push(`${summary.area}: ${summary.headline}`);
      lines.push(`Open items: ${summary.openItems}`);
      lines.push("Active tasks:");
      if (!summary.tasks.length) {
        lines.push("- None");
      } else {
        appendTaskLines(lines, summary.tasks);
      }
      lines.push("");
    }
  }

  lines.push("", "Briefing Feed");
  if (!digest.stories.length) {
    lines.push("No stories cleared the relevance threshold today.");
  } else {
    digest.stories.forEach((story, index) => {
      const leadPrefix = index === 0 ? "[LEAD] " : "";
      lines.push(
        `${leadPrefix}[${getTopicLabel(story.topic)}] ${getDisplayTitle(story)} (${formatSourceLabel(story.source)})`,
      );
      lines.push(`Relevance score: ${story.score}`);
      lines.push(`What happened: ${getWhatHappened(story)}`);
      lines.push(`Why it matters: ${getWhyItMatters(story)}`);
      lines.push(`Signal: ${story.signalOrNoise}`);
      lines.push(`Second-order effect: ${story.secondOrderEffect}`);
      lines.push(`Link: ${story.url}`);
      lines.push("");
    });
  }

  const storyLine = pluralize(digest.stories.length, "story", "stories");
  const taskLine = digest.taskSummaries.length
    ? ` · ${pluralize(digest.taskSummaries.length, "task area", "task areas")}`
    : "";
  lines.push(`${storyLine}${taskLine} · ${digest.dateLabel}`);

  return lines.join("\n");
}

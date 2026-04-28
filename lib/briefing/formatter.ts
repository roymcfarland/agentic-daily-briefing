import { escapeHtml } from "@/lib/html";
import type { BriefingDigest, RankedStory, TaskNode, TaskSummary } from "@/lib/briefing/types";
import { getTopicLabel } from "@/lib/research/topics";

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

function renderTaskNodes(tasks: TaskNode[], depth = 0): string {
  if (!tasks.length) {
    return `<p style="margin:0;color:#6b7280;">No active tasks in this list.</p>`;
  }

  const paddingLeft = depth === 0 ? 20 : 18;
  return `<ul style="margin:8px 0 0;padding-left:${paddingLeft}px;">${tasks
    .map(
      (task) => `
        <li style="margin:0 0 8px;">
          <span style="color:#111827;">${escapeHtml(task.title)}</span>
          <span style="color:#6b7280;"> (${escapeHtml(task.status)})</span>
          ${task.subtasks.length ? renderTaskNodes(task.subtasks, depth + 1) : ""}
        </li>
      `,
    )
    .join("")}</ul>`;
}

function renderTaskSummary(summary: TaskSummary): string {
  return `
    <section style="padding:18px;border:1px solid #e5e7eb;border-radius:16px;background:#ffffff;">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#9a3412;">${escapeHtml(summary.area)}</p>
      <h3 style="margin:0 0 8px;font-size:18px;color:#111827;">${escapeHtml(summary.headline)}</h3>
      <p style="margin:0 0 12px;color:#374151;"><strong>${summary.openItems}</strong> open items</p>
      <p style="margin:0 0 4px;font-weight:700;color:#111827;">Active tasks</p>
      ${renderTaskNodes(summary.tasks)}
    </section>
  `;
}

function appendTaskLines(lines: string[], tasks: TaskNode[], depth = 0) {
  const prefix = `${"  ".repeat(depth)}- `;

  for (const task of tasks) {
    lines.push(`${prefix}${task.title} (${task.status})`);
    appendTaskLines(lines, task.subtasks, depth + 1);
  }
}

function renderStory(story: RankedStory): string {
  const displayTitle = getDisplayTitle(story);
  const sourceLabel = formatSourceLabel(story.source);
  const signalTone = story.signalOrNoise === "Signal"
    ? "background:#ecfdf5;color:#166534;border-color:#bbf7d0;"
    : "background:#f3f4f6;color:#374151;border-color:#e5e7eb;";

  return `
    <article style="padding:18px 0;border-top:1px solid #e5e7eb;">
      <div style="margin:0 0 6px;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;">
        <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">${escapeHtml(getTopicLabel(story.topic))} • ${escapeHtml(sourceLabel)}</p>
        <span style="display:inline-block;padding:4px 10px;border:1px solid;border-radius:999px;font-size:12px;font-weight:700;${signalTone}">${escapeHtml(story.signalOrNoise)}</span>
      </div>
      <h3 style="margin:0 0 8px;font-size:18px;">
        <a href="${escapeHtml(story.url)}" style="color:#9a3412;text-decoration:none;">${escapeHtml(displayTitle)}</a>
      </h3>
      <p style="margin:0 0 8px;color:#111827;"><strong>What happened</strong><br />${escapeHtml(getWhatHappened(story))}</p>
      <p style="margin:0 0 8px;color:#111827;"><strong>Why it matters</strong><br />${escapeHtml(getWhyItMatters(story))}</p>
      <p style="margin:0;color:#111827;"><strong>Second-order effect</strong><br />${escapeHtml(story.secondOrderEffect)}</p>
    </article>
  `;
}

function renderWarningsBanner(warnings: string[]): string {
  if (!warnings.length) {
    return "";
  }

  const items = warnings
    .map((warning) => `<li style="margin:0 0 4px;">${escapeHtml(warning)}</li>`)
    .join("");

  return `
        <section style="margin:0 0 20px;padding:14px 16px;border:1px solid #fcd34d;background:#fffbeb;border-radius:12px;">
          <p style="margin:0 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#92400e;">Briefing notes</p>
          <ul style="margin:0;padding-left:18px;color:#78350f;">${items}</ul>
        </section>`;
}

export function renderBriefingEmail(digest: BriefingDigest): string {
  const hasTaskSummaries = digest.taskSummaries.length > 0;

  return `
  <!doctype html>
  <html lang="en">
    <body style="margin:0;padding:24px;background:#f5efe6;color:#111827;font-family:Georgia,serif;">
      <div style="max-width:840px;margin:0 auto;background:#fffdf9;border-radius:24px;padding:28px;border:1px solid #eadfce;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#9a3412;">Daily Digest</p>
        <h1 style="margin:0 0 8px;font-size:34px;line-height:1.1;">${escapeHtml(digest.dateLabel)}</h1>
        <p style="margin:0 0 24px;color:#4b5563;">Taskflow state plus live research filtered for decision relevance.</p>

        ${renderWarningsBanner(digest.warnings)}

        ${hasTaskSummaries
          ? `
        <section>
          <h2 style="margin:0 0 12px;font-size:22px;color:#111827;">Taskflow Snapshot</h2>
          <div style="display:grid;gap:14px;">
            ${digest.taskSummaries.map(renderTaskSummary).join("")}
          </div>
        </section>`
          : ""}

        <section style="margin-top:24px;">
          <h2 style="margin:0 0 12px;font-size:22px;color:#111827;">Briefing Feed</h2>
          ${digest.stories.map(renderStory).join("")}
        </section>

        <section style="margin-top:28px;padding-top:20px;border-top:2px solid #eadfce;">
          <h2 style="margin:0 0 12px;font-size:22px;">Closing View</h2>
          <p style="margin:0 0 10px;"><strong>One thing to watch:</strong> ${escapeHtml(digest.oneThingToWatch)}</p>
          <p style="margin:0 0 10px;"><strong>One thing to ignore:</strong> ${escapeHtml(digest.oneThingToIgnore)}</p>
          <p style="margin:0;"><strong>One possible contrarian take:</strong> ${escapeHtml(digest.oneContrarianTake)}</p>
        </section>
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

  if (digest.taskSummaries.length) {
    lines.push("", "Taskflow Snapshot");

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
  for (const story of digest.stories) {
    lines.push(`[${getTopicLabel(story.topic)}] ${getDisplayTitle(story)} (${formatSourceLabel(story.source)})`);
    lines.push(`What happened: ${getWhatHappened(story)}`);
    lines.push(`Why it matters: ${getWhyItMatters(story)}`);
    lines.push(`Signal: ${story.signalOrNoise}`);
    lines.push(`Second-order effect: ${story.secondOrderEffect}`);
    lines.push(`Link: ${story.url}`);
    lines.push("");
  }

  lines.push(`One thing to watch: ${digest.oneThingToWatch}`);
  lines.push(`One thing to ignore: ${digest.oneThingToIgnore}`);
  lines.push(`One possible contrarian take: ${digest.oneContrarianTake}`);

  return lines.join("\n");
}

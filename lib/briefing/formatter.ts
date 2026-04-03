import { escapeHtml } from "@/lib/html";
import type { BriefingDigest, ResearchTopic, TaskSummary } from "@/lib/briefing/types";
import { getTopicLabel } from "@/lib/research/topics";

function renderList(items: string[], emptyText: string): string {
  if (!items.length) {
    return `<p style="margin:0;color:#6b7280;">${escapeHtml(emptyText)}</p>`;
  }

  return `<ul style="margin:8px 0 0;padding-left:18px;">${items
    .map((item) => `<li style="margin:0 0 6px;">${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

function renderTaskSummary(summary: TaskSummary): string {
  return `
    <section style="padding:18px;border:1px solid #e5e7eb;border-radius:16px;background:#ffffff;">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#9a3412;">${escapeHtml(summary.area)}</p>
      <h3 style="margin:0 0 8px;font-size:18px;color:#111827;">${escapeHtml(summary.headline)}</h3>
      <p style="margin:0 0 12px;color:#374151;"><strong>${summary.openItems}</strong> open items</p>
      <p style="margin:0 0 4px;font-weight:700;color:#111827;">Priorities</p>
      ${renderList(summary.priorities, "No explicit priorities returned.")}
      <p style="margin:12px 0 4px;font-weight:700;color:#111827;">Due today</p>
      ${renderList(summary.dueToday, "Nothing due today.")}
      <p style="margin:12px 0 4px;font-weight:700;color:#111827;">Blockers</p>
      ${renderList(summary.blockers, "No blockers reported.")}
    </section>
  `;
}

function renderTopic(topic: ResearchTopic, digest: BriefingDigest): string {
  const stories = digest.stories.filter((story) => story.topic === topic);
  if (!stories.length) {
    return "";
  }

  return `
    <section style="margin-top:24px;">
      <h2 style="margin:0 0 12px;font-size:22px;color:#111827;">${escapeHtml(getTopicLabel(topic))}</h2>
      ${stories
        .map(
          (story) => `
            <article style="padding:18px 0;border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">${escapeHtml(story.source)}</p>
              <h3 style="margin:0 0 8px;font-size:18px;">
                <a href="${escapeHtml(story.url)}" style="color:#9a3412;text-decoration:none;">${escapeHtml(story.title)}</a>
              </h3>
              <p style="margin:0 0 8px;color:#111827;"><strong>What happened:</strong> ${escapeHtml(story.summary || story.title)}</p>
              <p style="margin:0 0 8px;color:#111827;"><strong>Why it matters:</strong> ${escapeHtml(story.whyItMatters)}</p>
              <p style="margin:0 0 8px;color:#111827;"><strong>Signal or noise:</strong> ${escapeHtml(story.signalOrNoise)}</p>
              <p style="margin:0;color:#111827;"><strong>One possible second-order effect:</strong> ${escapeHtml(story.secondOrderEffect)}</p>
            </article>
          `,
        )
        .join("")}
    </section>
  `;
}

export function renderBriefingEmail(digest: BriefingDigest): string {
  const topicOrder: ResearchTopic[] = [
    "ai",
    "markets",
    "business",
    "cannabis",
    "chicago",
    "colorado",
    "asymmetric-upside",
  ];

  return `
  <!doctype html>
  <html lang="en">
    <body style="margin:0;padding:24px;background:#f5efe6;color:#111827;font-family:Georgia,serif;">
      <div style="max-width:840px;margin:0 auto;background:#fffdf9;border-radius:24px;padding:28px;border:1px solid #eadfce;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#9a3412;">Weekday Morning Brief</p>
        <h1 style="margin:0 0 8px;font-size:34px;line-height:1.1;">${escapeHtml(digest.dateLabel)}</h1>
        <p style="margin:0 0 24px;color:#4b5563;">Taskflow state plus live research filtered for decision relevance.</p>

        <section>
          <h2 style="margin:0 0 12px;font-size:22px;color:#111827;">Taskflow Snapshot</h2>
          <div style="display:grid;gap:14px;">
            ${digest.taskSummaries.map(renderTaskSummary).join("")}
          </div>
        </section>

        ${topicOrder.map((topic) => renderTopic(topic, digest)).join("")}

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
    `Weekday Morning Brief - ${digest.dateLabel}`,
    "",
    "Taskflow Snapshot",
  ];

  for (const summary of digest.taskSummaries) {
    lines.push(`${summary.area}: ${summary.headline}`);
    lines.push(`Open items: ${summary.openItems}`);
    lines.push(`Priorities: ${summary.priorities.join("; ") || "None"}`);
    lines.push(`Due today: ${summary.dueToday.join("; ") || "None"}`);
    lines.push(`Blockers: ${summary.blockers.join("; ") || "None"}`);
    lines.push("");
  }

  for (const story of digest.stories) {
    lines.push(`[${getTopicLabel(story.topic)}] ${story.title} (${story.source})`);
    lines.push(`What happened: ${story.summary || story.title}`);
    lines.push(`Why it matters: ${story.whyItMatters}`);
    lines.push(`Signal or noise: ${story.signalOrNoise}`);
    lines.push(`Second-order effect: ${story.secondOrderEffect}`);
    lines.push(`Link: ${story.url}`);
    lines.push("");
  }

  lines.push(`One thing to watch: ${digest.oneThingToWatch}`);
  lines.push(`One thing to ignore: ${digest.oneThingToIgnore}`);
  lines.push(`One possible contrarian take: ${digest.oneContrarianTake}`);

  return lines.join("\n");
}

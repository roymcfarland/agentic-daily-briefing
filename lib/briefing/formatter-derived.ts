import type { BriefingDigest, RankedStory, TaskNode } from "@/lib/briefing/types";

export function countTaskNodes(tasks: TaskNode[]): number {
  let total = 0;
  for (const task of tasks) {
    total += 1 + countTaskNodes(task.subtasks);
  }
  return total;
}

export interface TopStoryPointer {
  story: RankedStory;
  framing: string;
}

export interface DigestDerived {
  signalCount: number;
  noiseCount: number;
  storyCount: number;
  beatCount: number;
  maxScore: number;
  avgScore: number;
  fresh12Count: number;
  unpublishedCount: number;
  blueprintTaskNodes: number;
  blueprintAreas: number;
  pulseSentence: string;
  topStoryPointer: TopStoryPointer | null;
}

export function buildDigestDerived(digest: BriefingDigest): DigestDerived {
  const stories = digest.stories;
  const signalCount = stories.filter((s) => s.signalOrNoise === "Signal").length;
  const noiseCount = stories.filter((s) => s.signalOrNoise === "Noise").length;
  const storyCount = stories.length;
  const beatCount = new Set(stories.map((s) => s.topic)).size;
  const scores = stories.map((s) => s.score);
  const maxScore = scores.length ? Math.max(...scores) : 0;
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const now = Date.now();
  let fresh12Count = 0;
  let unpublishedCount = 0;
  for (const story of stories) {
    if (!story.publishedAt) {
      unpublishedCount += 1;
      continue;
    }
    const t = Date.parse(story.publishedAt);
    if (Number.isNaN(t)) {
      unpublishedCount += 1;
      continue;
    }
    if ((now - t) / (1000 * 60 * 60) <= 12) {
      fresh12Count += 1;
    }
  }

  let blueprintTaskNodes = 0;
  for (const summary of digest.taskSummaries) {
    blueprintTaskNodes += countTaskNodes(summary.tasks);
  }

  let pulseSentence: string;
  if (!storyCount) {
    pulseSentence =
      "No ranked stories cleared the bar today — lean on Blueprint and the Decision Lens to orient the morning.";
  } else if (noiseCount === 0 && signalCount > 0) {
    pulseSentence =
      "Everything here reads as Signal — treat each item as decision-bearing until something proves otherwise.";
  } else if (signalCount > noiseCount) {
    pulseSentence =
      "Skews Signal-heavy — anchor on the lead, then skim Noise items when you want peripheral context.";
  } else if (noiseCount > signalCount) {
    pulseSentence =
      "Skews Noise-heavy — scan headlines first; depth-read where relevance score or freshness pulls you in.";
  } else {
    pulseSentence =
      "Balanced Signal and Noise — read for calibration and texture rather than urgency.";
  }

  // The stories array arrives sorted by score descending, so the first Signal
  // we find is also the highest-scored Signal. When no Signal exists, fall back
  // to the highest-scored story regardless of label (stories[0]).
  let topStoryPointer: TopStoryPointer | null = null;
  if (storyCount > 0) {
    const chosen = stories.find((s) => s.signalOrNoise === "Signal") ?? stories[0];
    topStoryPointer = {
      story: chosen,
      framing: chosen.secondOrderEffect,
    };
  }

  return {
    signalCount,
    noiseCount,
    storyCount,
    beatCount,
    maxScore,
    avgScore,
    fresh12Count,
    unpublishedCount,
    blueprintTaskNodes,
    blueprintAreas: digest.taskSummaries.length,
    pulseSentence,
    topStoryPointer,
  };
}

export function renderDeskFactsLinePlain(d: DigestDerived): string {
  const parts: string[] = [];
  if (d.storyCount > 0) {
    parts.push(`${d.beatCount} beat${d.beatCount === 1 ? "" : "s"} represented`);
    parts.push(`peak relevance ${d.maxScore}`);
    parts.push(`avg ${d.avgScore}`);
    parts.push(`${d.fresh12Count} fresh (<12h)`);
    if (d.unpublishedCount > 0) {
      parts.push(`${d.unpublishedCount} no timestamp`);
    }
  }
  if (d.blueprintAreas > 0) {
    parts.push(`${d.blueprintTaskNodes} blueprint task${d.blueprintTaskNodes === 1 ? "" : "s"} tracked`);
  }
  return parts.join(" · ");
}

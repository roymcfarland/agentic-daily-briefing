import type { BriefingDigest, RankedStory, TaskNode } from "@/lib/briefing/types";
import { ageInHours } from "@/lib/briefing/freshness";

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
    const age = ageInHours(story.publishedAt, new Date(now));
    if (age === null) {
      unpublishedCount += 1;
      continue;
    }
    if (age <= 12) {
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

  // Do NOT assume digest.stories is score-sorted. selectStoriesForBriefing
  // (lib/briefing/pipeline.ts:119) produces topic-balanced round-robin output,
  // not score-sorted output. Compute the highest-scored Signal explicitly,
  // falling back to the highest-scored story overall when no Signal exists.
  // We sort a copy because digest.stories is shared with the HTML/text
  // renderers and must not be reordered.
  let topStoryPointer: TopStoryPointer | null = null;
  if (storyCount > 0) {
    const sortedByScoreDesc = [...stories].sort((a, b) => b.score - a.score);
    const chosen =
      sortedByScoreDesc.find((s) => s.signalOrNoise === "Signal") ??
      sortedByScoreDesc[0];
    topStoryPointer = {
      story: chosen,
      framing: chosen.whyItMatters,
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

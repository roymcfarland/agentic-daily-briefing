import { getEnv } from "@/lib/env";
import type {
  BriefingDigest,
  RankedStory,
  ResearchTopic,
  StoryCandidate,
} from "@/lib/briefing/types";
import { rankStories } from "@/lib/briefing/ranker";
import { getTaskSummaries } from "@/lib/taskflow";
import { getChicagoDateLabel } from "@/lib/time";
import { fetchGoogleNewsStories } from "@/lib/research/google-news";
import { TOPIC_CONFIG } from "@/lib/research/topics";

function summarizeWatch(stories: RankedStory[]): string {
  const top = stories[0];
  if (!top) {
    return "Watch for any signal that changes capital allocation or execution timing today.";
  }

  return `${top.title} could matter more than it first appears if the downstream effect reaches pricing, partners, or regulation.`;
}

function summarizeIgnore(stories: RankedStory[]): string {
  const noisy = stories.find((story) => story.signalOrNoise === "Noise");
  if (!noisy) {
    return "Ignore low-information headlines that do not clearly alter demand, margin, or execution risk.";
  }

  return `${noisy.title} looks easy to overreact to, but the current signal is still weak.`;
}

function summarizeContrarian(stories: RankedStory[]): string {
  const asymmetric = stories.find((story) => story.topic === "asymmetric-upside");
  if (!asymmetric) {
    return "The non-consensus edge may come from niche infrastructure bets rather than the loudest AI headlines.";
  }

  return `${asymmetric.title} may be early enough that the market is still underpricing the upside.`;
}

function chooseStories(stories: RankedStory[], maxItems: number): RankedStory[] {
  const guaranteedTopics: ResearchTopic[] = [
    "ai",
    "markets",
    "business",
    "cannabis",
    "chicago",
    "colorado",
    "asymmetric-upside",
  ];

  const selected: RankedStory[] = [];
  const seen = new Set<string>();

  for (const topic of guaranteedTopics) {
    const story = stories.find((candidate) => candidate.topic === topic && !seen.has(candidate.dedupeKey));
    if (story) {
      selected.push(story);
      seen.add(story.dedupeKey);
    }
  }

  for (const story of stories) {
    if (selected.length >= maxItems) {
      break;
    }

    if (seen.has(story.dedupeKey)) {
      continue;
    }

    selected.push(story);
    seen.add(story.dedupeKey);
  }

  return selected;
}

async function fetchLiveResearch(): Promise<StoryCandidate[]> {
  const results = await Promise.allSettled(
    TOPIC_CONFIG.flatMap((entry) =>
      entry.queries.map((query) => fetchGoogleNewsStories(entry.topic, query)),
    ),
  );

  const candidates: StoryCandidate[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      candidates.push(...result.value);
    }
  }

  return candidates;
}

export async function buildBriefingDigest(now: Date): Promise<BriefingDigest> {
  const env = getEnv();
  const [taskSummaries, researchCandidates] = await Promise.all([
    getTaskSummaries(now),
    fetchLiveResearch(),
  ]);

  const rankedStories = rankStories(researchCandidates);
  const stories = chooseStories(rankedStories, env.briefingMaxItems);

  return {
    dateLabel: getChicagoDateLabel(now),
    taskSummaries,
    stories,
    oneThingToWatch: summarizeWatch(stories),
    oneThingToIgnore: summarizeIgnore(rankedStories),
    oneContrarianTake: summarizeContrarian(stories),
  };
}

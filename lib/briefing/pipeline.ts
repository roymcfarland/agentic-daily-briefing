import { getEnv } from "@/lib/env";
import type {
  BriefingDigest,
  RankedStory,
  ResearchTopic,
  StoryCandidate,
  SportsUpdate,
  TaskSummary,
} from "@/lib/briefing/types";
import { rankStories } from "@/lib/briefing/ranker";
import { getTaskSummaries } from "@/lib/blueprint";
import { getChicagoDateLabel } from "@/lib/time";
import { fetchGoogleNewsStories } from "@/lib/research/google-news";
import { getSportsLabel, SPORTS_CONFIG, TOPIC_CONFIG } from "@/lib/research/topics";

type SportsCandidate = StoryCandidate & {
  sportsArea: SportsUpdate["sportsArea"];
  sportsLabel: string;
};

const BRIEFING_TOPIC_ORDER: ResearchTopic[] = [
  "ai",
  "markets",
  "business",
  "cpg-startups",
  "cannabis",
  "chicago",
  "colorado",
  "asymmetric-upside",
  "sports",
];

const MAX_STORIES_PER_TOPIC = 2;
const SOFT_MAX_STORIES_PER_TOPIC = 2;
const EXTRA_TOPIC_STORY_MIN_SCORE = 40;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function warnPartialFailure(source: string, error: unknown) {
  console.warn(`${source} unavailable`, {
    message: getErrorMessage(error),
  });
}

function containsKeyword(text: string, keywords: string[]): boolean {
  const haystack = text.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
}

function isSportsStoryFresh(story: StoryCandidate, now: Date): boolean {
  if (!story.publishedAt) {
    return false;
  }

  const published = new Date(story.publishedAt).getTime();
  if (Number.isNaN(published)) {
    return false;
  }

  const ageHours = Math.max(0, (now.getTime() - published) / (1000 * 60 * 60));
  return ageHours <= 72;
}

function summarizeWatch(stories: RankedStory[]): string {
  const top = stories.find((story) => story.signalOrNoise === "Signal") ?? stories[0];
  if (!top) {
    return "Watch for any signal that changes capital allocation or execution timing today.";
  }

  return `${top.title} could matter more than it first appears if the downstream effect reaches pricing, partners, or regulation.`;
}

function isWithinPastWeek(story: RankedStory, now: Date): boolean {
  if (!story.publishedAt) {
    return false;
  }

  const publishedAt = new Date(story.publishedAt).getTime();
  if (Number.isNaN(publishedAt)) {
    return false;
  }

  const ageHours = Math.max(0, (now.getTime() - publishedAt) / (1000 * 60 * 60));
  return ageHours <= 24 * 7;
}

function summarizeIgnore(displayedStories: RankedStory[], rankedStories: RankedStory[], now: Date): string {
  const displayedNoise = displayedStories.find((story) => story.signalOrNoise === "Noise");
  if (displayedNoise) {
    return `${displayedNoise.title} looks easy to overreact to, but the current signal is still weak.`;
  }

  const displayedKeys = new Set(displayedStories.map((story) => story.dedupeKey));
  const outsideNoise = rankedStories.find(
    (story) =>
      story.signalOrNoise === "Noise" &&
      !displayedKeys.has(story.dedupeKey) &&
      isWithinPastWeek(story, now),
  );

  if (outsideNoise) {
    return `${outsideNoise.title} looks easy to overreact to, but it did not make the briefing because the decision value still seems limited.`;
  }

  return "Ignore low-information headlines that do not clearly alter demand, margin, or execution risk.";
}

function summarizeContrarian(stories: RankedStory[]): string {
  const asymmetric = stories.find((story) => story.topic === "asymmetric-upside");
  if (!asymmetric) {
    return "The non-consensus edge may come from niche infrastructure bets rather than the loudest AI headlines.";
  }

  return `${asymmetric.title} may be early enough that the market is still underpricing the upside.`;
}

export function selectStoriesForBriefing(stories: RankedStory[], maxItems: number): RankedStory[] {
  const selected: RankedStory[] = [];
  const seen = new Set<string>();
  const perTopicCount = new Map<ResearchTopic, number>();

  for (let round = 0; selected.length < maxItems; round += 1) {
    let addedInRound = false;

    for (const topic of BRIEFING_TOPIC_ORDER) {
      if (selected.length >= maxItems) {
        break;
      }

      const topicCount = perTopicCount.get(topic) ?? 0;
      const topicLimit = round === 0 ? 1 : MAX_STORIES_PER_TOPIC;
      if (topicCount >= topicLimit) {
        continue;
      }

      const story = stories.find(
        (candidate) => candidate.topic === topic && !seen.has(candidate.dedupeKey),
      );

      if (!story) {
        continue;
      }

      selected.push(story);
      seen.add(story.dedupeKey);
      perTopicCount.set(topic, topicCount + 1);
      addedInRound = true;
    }

    if (!addedInRound) {
      break;
    }
  }

  for (const story of stories) {
    if (selected.length >= maxItems) {
      break;
    }

    if (seen.has(story.dedupeKey)) {
      continue;
    }

    const topicCount = perTopicCount.get(story.topic) ?? 0;
    if (topicCount >= SOFT_MAX_STORIES_PER_TOPIC && story.score < EXTRA_TOPIC_STORY_MIN_SCORE) {
      continue;
    }

    selected.push(story);
    seen.add(story.dedupeKey);
    perTopicCount.set(story.topic, topicCount + 1);
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
    } else {
      warnPartialFailure("Google News research feed", result.reason);
    }
  }

  return candidates;
}

async function fetchSportsResearch(now: Date): Promise<SportsUpdate[]> {
  const results = await Promise.allSettled(
    SPORTS_CONFIG.flatMap((entry) =>
      entry.queries.map(async (query) => {
        const stories = await fetchGoogleNewsStories("sports", query);
        return stories.map((story) => ({
          ...story,
          sportsArea: entry.sportsArea,
          sportsLabel: entry.label,
        }));
      }),
    ),
  );

  const candidates: SportsCandidate[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      candidates.push(...result.value);
    } else {
      warnPartialFailure("Google News sports feed", result.reason);
    }
  }

  const filteredCandidates = candidates.filter((story) => {
    const config = SPORTS_CONFIG.find((entry) => entry.sportsArea === story.sportsArea);
    if (!config) {
      return false;
    }

    return (
      isSportsStoryFresh(story, now) &&
      containsKeyword(story.title, config.requiredKeywords)
    );
  });

  const ranked = rankStories(filteredCandidates).map((story) => {
    const sportsStory = filteredCandidates.find((candidate) => candidate.url === story.url);
    return {
      ...story,
      sportsArea: sportsStory?.sportsArea ?? "tennis",
      sportsLabel: sportsStory?.sportsLabel ?? getSportsLabel("tennis"),
    } satisfies SportsUpdate;
  });

  return SPORTS_CONFIG.flatMap((entry) => {
    const story = ranked.find((candidate) => candidate.sportsArea === entry.sportsArea);
    return story ? [story] : [];
  });
}

interface TaskSummariesResult {
  summaries: TaskSummary[];
  warning?: string;
}

const MAX_WARNING_DETAIL_LENGTH = 200;

function truncateDetail(message: string, max = MAX_WARNING_DETAIL_LENGTH): string {
  const collapsed = message.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) {
    return collapsed;
  }

  return `${collapsed.slice(0, max - 1).trimEnd()}…`;
}

async function getSafeTaskSummaries(now: Date): Promise<TaskSummariesResult> {
  try {
    return { summaries: await getTaskSummaries(now) };
  } catch (error) {
    warnPartialFailure("Blueprint daily summary", error);
    return {
      summaries: [],
      warning: `Tasks unavailable today: ${truncateDetail(getErrorMessage(error))}`,
    };
  }
}

export async function buildBriefingDigest(now: Date): Promise<BriefingDigest> {
  const env = getEnv();
  const [taskResult, researchCandidates, sportsUpdates] = await Promise.all([
    getSafeTaskSummaries(now),
    fetchLiveResearch(),
    fetchSportsResearch(now),
  ]);

  const rankedStories = rankStories(researchCandidates);
  const allRankedStories = [...rankedStories, ...sportsUpdates].sort(
    (left, right) => right.score - left.score,
  );
  const stories = selectStoriesForBriefing(allRankedStories, env.briefingMaxItems);

  const warnings: string[] = [];
  if (taskResult.warning) {
    warnings.push(taskResult.warning);
  }

  return {
    dateLabel: getChicagoDateLabel(now),
    taskSummaries: taskResult.summaries,
    stories,
    oneThingToWatch: summarizeWatch(stories),
    oneThingToIgnore: summarizeIgnore(stories, allRankedStories, now),
    oneContrarianTake: summarizeContrarian(stories),
    warnings,
  };
}

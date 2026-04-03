import type { RankedStory, ResearchTopic, StoryCandidate } from "@/lib/briefing/types";
import { getTopicLabel } from "@/lib/research/topics";

const SOURCE_BONUS: Record<string, number> = {
  Reuters: 14,
  Bloomberg: 13,
  "The Wall Street Journal": 12,
  "Financial Times": 12,
  CNBC: 10,
  AP: 9,
  TechCrunch: 8,
};

const TOPIC_BONUS: Record<ResearchTopic, number> = {
  ai: 14,
  markets: 13,
  business: 12,
  cannabis: 15,
  chicago: 11,
  colorado: 11,
  "asymmetric-upside": 16,
};

const HIGH_SIGNAL_PATTERNS = [
  /\b(acquisition|merger|funding|earnings|forecast|guidance|regulation|lawsuit|approval|ban)\b/i,
  /\b(launch|partnership|expansion|contract|tariff|treasury|fed|inflation|pricing)\b/i,
  /\b(cannabis|hemp|dispensary|AI|chip|semiconductor|downtown|transit|grid|robotics)\b/i,
];

const LOW_SIGNAL_PATTERNS = [
  /\b(opinion|podcast|video|gallery|sponsored|paid post|press release)\b/i,
  /\b(celebrity|lifestyle|roundup|what to know|watch live)\b/i,
];

function canonicalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an|to|for|of|in|on)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildDedupeKey(story: StoryCandidate): string {
  return canonicalize(story.title);
}

export function isLowSignal(story: StoryCandidate): boolean {
  const haystack = `${story.title} ${story.summary}`;
  return LOW_SIGNAL_PATTERNS.some((pattern) => pattern.test(haystack));
}

function getFreshnessBonus(publishedAt?: string): number {
  if (!publishedAt) {
    return 0;
  }

  const published = new Date(publishedAt).getTime();
  if (Number.isNaN(published)) {
    return 0;
  }

  const ageHours = Math.max(0, (Date.now() - published) / (1000 * 60 * 60));
  if (ageHours <= 6) {
    return 12;
  }
  if (ageHours <= 18) {
    return 8;
  }
  if (ageHours <= 36) {
    return 4;
  }

  return 0;
}

function getSignalScore(story: StoryCandidate): number {
  const haystack = `${story.title} ${story.summary}`;
  return HIGH_SIGNAL_PATTERNS.reduce(
    (score, pattern) => score + (pattern.test(haystack) ? 6 : 0),
    0,
  );
}

function getSourceScore(source: string): number {
  const exact = SOURCE_BONUS[source];
  if (exact) {
    return exact;
  }

  const fuzzy = Object.entries(SOURCE_BONUS).find(([name]) => source.includes(name));
  return fuzzy?.[1] ?? 5;
}

function inferWhyItMatters(story: StoryCandidate): string {
  const topicLabel = getTopicLabel(story.topic);
  const summary = story.summary || "No summary was provided in the feed.";

  if (story.topic === "markets") {
    return `This may change near-term capital costs, risk appetite, or pricing assumptions. ${summary}`;
  }

  if (story.topic === "cannabis") {
    return `This can affect operator margins, compliance exposure, and channel strategy. ${summary}`;
  }

  if (story.topic === "ai") {
    return `This matters if it shifts model economics, distribution power, or enterprise adoption timing. ${summary}`;
  }

  return `${topicLabel} relevance is mainly in downstream operational or strategic decisions. ${summary}`;
}

function inferSecondOrderEffect(story: StoryCandidate): string {
  if (story.topic === "markets") {
    return "A rates or liquidity move could re-rank which bets deserve capital this week.";
  }
  if (story.topic === "chicago" || story.topic === "colorado") {
    return "Local policy or economic moves could quietly reshape hiring, customer demand, or permitting friction.";
  }
  if (story.topic === "asymmetric-upside") {
    return "A small early signal here could become a low-consensus wedge before most operators notice it.";
  }

  return "The first-order headline may be modest, but the real impact could show up in pricing, partnerships, or execution speed.";
}

export function rankStories(candidates: StoryCandidate[]): RankedStory[] {
  const deduped = new Map<string, StoryCandidate>();

  for (const story of candidates) {
    if (isLowSignal(story)) {
      continue;
    }

    const dedupeKey = buildDedupeKey(story);
    const existing = deduped.get(dedupeKey);

    if (!existing) {
      deduped.set(dedupeKey, story);
      continue;
    }

    const existingScore = getSourceScore(existing.source) + getFreshnessBonus(existing.publishedAt);
    const incomingScore = getSourceScore(story.source) + getFreshnessBonus(story.publishedAt);
    if (incomingScore > existingScore) {
      deduped.set(dedupeKey, story);
    }
  }

  return Array.from(deduped.values())
    .map((story) => {
      const dedupeKey = buildDedupeKey(story);
      const score =
        TOPIC_BONUS[story.topic] +
        getSourceScore(story.source) +
        getSignalScore(story) +
        getFreshnessBonus(story.publishedAt);

      return {
        ...story,
        dedupeKey,
        score,
        whyItMatters: inferWhyItMatters(story),
        signalOrNoise: score >= 30 ? "Signal" : "Noise",
        secondOrderEffect: inferSecondOrderEffect(story),
      } satisfies RankedStory;
    })
    .sort((left, right) => right.score - left.score);
}

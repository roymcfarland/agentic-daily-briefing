import type { RankedStory, ResearchTopic, StoryCandidate } from "@/lib/briefing/types";
import { getTopicLabel } from "@/lib/research/topics";

const SOURCE_BONUS: Record<string, number> = {
  Reuters: 18,
  Bloomberg: 17,
  "The Wall Street Journal": 16,
  "Financial Times": 16,
  CNBC: 13,
  AP: 13,
  TechCrunch: 10,
};

const TOPIC_BONUS: Record<ResearchTopic, number> = {
  ai: 13,
  markets: 14,
  business: 11,
  cannabis: 15,
  chicago: 12,
  colorado: 12,
  "asymmetric-upside": 14,
};

const LOW_SIGNAL_PATTERNS = [
  /\b(opinion|podcast|video|gallery|sponsored|paid post|press release)\b/i,
  /\b(celebrity|lifestyle|roundup|what to know|watch live)\b/i,
];

const FRESHNESS_WINDOW_HOURS = 72;

const OPERATIONAL_PATTERNS = [
  /\b(earnings|forecast|guidance|margin|pricing|demand|supply|inventory|contract|partnership|expansion)\b/i,
  /\b(layoffs|hiring|launch|shipment|distribution|manufacturing|production|automation)\b/i,
];

const CAPITAL_PATTERNS = [
  /\b(fed|rates|treasury|inflation|tariff|funding|seed round|valuation|capital|liquidity)\b/i,
  /\b(acquisition|merger|buyout|debt|credit|financing)\b/i,
];

const REGULATORY_PATTERNS = [
  /\b(regulation|regulatory|court|judge|lawsuit|ban|approve|approval|rescheduling|enforcement)\b/i,
  /\b(policy|bill|committee|senate|house|governor|fda|dea)\b/i,
];

const LOCAL_PATTERNS: Partial<Record<ResearchTopic, RegExp[]>> = {
  chicago: [/\b(chicago|cook county|illinois|cta|downtown)\b/i],
  colorado: [/\b(colorado|denver|boulder)\b/i],
  cannabis: [/\b(cannabis|hemp|thc|dispensary|operator)\b/i],
  ai: [/\b(ai|model|chip|semiconductor|inference|training)\b/i],
  "asymmetric-upside": [/\b(robotics|nuclear|grid|storage|geothermal|humanoid)\b/i],
};

const NOVELTY_PENALTIES = [
  /\b(explainer|what it means|what to know|roundup|recap|analysis)\b/i,
  /\b(most popular|top stories|watch list|here'?s what to watch)\b/i,
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

function tokenize(text: string): Set<string> {
  return new Set(
    canonicalize(text)
      .split(" ")
      .filter((token) => token.length > 2),
  );
}

function titleSimilarity(left: string, right: string): number {
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);
  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(leftTokens.size, rightTokens.size);
}

export function isLowSignal(story: StoryCandidate): boolean {
  const haystack = `${story.title} ${story.summary}`;
  return LOW_SIGNAL_PATTERNS.some((pattern) => pattern.test(haystack));
}

export function isFreshStory(story: StoryCandidate, now = new Date()): boolean {
  if (!story.publishedAt) {
    return false;
  }

  const published = new Date(story.publishedAt).getTime();
  if (Number.isNaN(published)) {
    return false;
  }

  const ageHours = Math.max(0, (now.getTime() - published) / (1000 * 60 * 60));
  return ageHours <= FRESHNESS_WINDOW_HOURS;
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

function countPatternMatches(patterns: RegExp[], story: StoryCandidate): number {
  const haystack = `${story.title} ${story.summary}`;
  return patterns.reduce(
    (score, pattern) => score + (pattern.test(haystack) ? 6 : 0),
    0,
  );
}

function getOperationalScore(story: StoryCandidate): number {
  return Math.min(18, countPatternMatches(OPERATIONAL_PATTERNS, story));
}

function getCapitalScore(story: StoryCandidate): number {
  return Math.min(14, countPatternMatches(CAPITAL_PATTERNS, story));
}

function getRegulatoryScore(story: StoryCandidate): number {
  return Math.min(16, countPatternMatches(REGULATORY_PATTERNS, story));
}

function getLocalRelevanceScore(story: StoryCandidate): number {
  const patterns = LOCAL_PATTERNS[story.topic] ?? [];
  return Math.min(10, countPatternMatches(patterns, story));
}

function getNoveltyPenalty(story: StoryCandidate): number {
  const haystack = `${story.title} ${story.summary}`;
  return NOVELTY_PENALTIES.reduce(
    (score, pattern) => score + (pattern.test(haystack) ? 8 : 0),
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

function getDecisionRelevanceScore(story: StoryCandidate): number {
  return (
    TOPIC_BONUS[story.topic] +
    getSourceScore(story.source) +
    getFreshnessBonus(story.publishedAt) +
    getOperationalScore(story) +
    getCapitalScore(story) +
    getRegulatoryScore(story) +
    getLocalRelevanceScore(story) -
    getNoveltyPenalty(story)
  );
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
  const deduped: StoryCandidate[] = [];

  for (const story of candidates) {
    if (isLowSignal(story) || !isFreshStory(story)) {
      continue;
    }

    const dedupeKey = buildDedupeKey(story);
    const existingIndex = deduped.findIndex((candidate) => {
      const candidateKey = buildDedupeKey(candidate);
      return (
        candidateKey === dedupeKey ||
        story.url === candidate.url ||
        titleSimilarity(candidate.title, story.title) >= 0.78
      );
    });

    if (existingIndex === -1) {
      deduped.push(story);
      continue;
    }

    const existing = deduped[existingIndex];
    const existingScore = getDecisionRelevanceScore(existing);
    const incomingScore = getDecisionRelevanceScore(story);
    if (incomingScore > existingScore) {
      deduped[existingIndex] = story;
    }
  }

  return deduped
    .map((story) => {
      const dedupeKey = buildDedupeKey(story);
      const score = getDecisionRelevanceScore(story);

      return {
        ...story,
        dedupeKey,
        score,
        whyItMatters: inferWhyItMatters(story),
        signalOrNoise: score >= 40 ? "Signal" : "Noise",
        secondOrderEffect: inferSecondOrderEffect(story),
      } satisfies RankedStory;
    })
    .sort((left, right) => right.score - left.score);
}

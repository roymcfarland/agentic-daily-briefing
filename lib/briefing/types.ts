export type CoverageArea =
  | "personal"
  | "elevated-organics"
  | "brightline-labs";

export type ResearchTopic =
  | "ai"
  | "markets"
  | "business"
  | "cannabis"
  | "chicago"
  | "colorado"
  | "asymmetric-upside";

export interface TaskSummary {
  area: CoverageArea;
  headline: string;
  openItems: number;
  blockers: string[];
  priorities: string[];
  dueToday: string[];
  rawSummary?: string;
}

export interface StoryCandidate {
  topic: ResearchTopic;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt?: string;
}

export interface RankedStory extends StoryCandidate {
  dedupeKey: string;
  score: number;
  whyItMatters: string;
  signalOrNoise: "Signal" | "Noise";
  secondOrderEffect: string;
}

export interface BriefingDigest {
  dateLabel: string;
  taskSummaries: TaskSummary[];
  stories: RankedStory[];
  oneThingToWatch: string;
  oneThingToIgnore: string;
  oneContrarianTake: string;
}

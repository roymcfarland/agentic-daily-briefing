export type CoverageArea = string;

export interface TaskNode {
  id: number | string;
  title: string;
  status: "in-progress" | "on-deck";
  subtasks: TaskNode[];
}

export type ResearchTopic =
  | "ai"
  | "markets"
  | "business"
  | "cpg-startups"
  | "chicago"
  | "colorado"
  | "asymmetric-upside"
  | "sports";

export type SportsArea =
  | "denver-broncos"
  | "colorado-buffaloes-football"
  | "notre-dame-football"
  | "tennis";

export interface TaskSummary {
  area: CoverageArea;
  headline: string;
  openItems: number;
  tasks: TaskNode[];
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
}

export interface SportsUpdate extends RankedStory {
  sportsArea: SportsArea;
  sportsLabel: string;
}

export interface BriefingDigest {
  dateLabel: string;
  taskSummaries: TaskSummary[];
  stories: RankedStory[];
  oneThingToWatch: string;
  oneThingToIgnore: string;
  oneContrarianTake: string;
  warnings: string[];
}

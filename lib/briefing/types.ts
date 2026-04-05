export type CoverageArea =
  | "personal"
  | "brightline-labs"
  | "elevated-organics";

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
  | "cannabis"
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
  secondOrderEffect: string;
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
}

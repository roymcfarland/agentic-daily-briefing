import type { ResearchTopic, SportsArea } from "@/lib/briefing/types";

interface TopicConfig {
  topic: ResearchTopic;
  label: string;
  queries: string[];
}

export const TOPIC_CONFIG: TopicConfig[] = [
  {
    topic: "ai",
    label: "AI",
    queries: [
      "artificial intelligence frontier models MCP LLM GPUs enterprise deployment",
      "OpenAI Anthropic Google Microsoft AI enterprise agents inference GPUs",
    ],
  },
  {
    topic: "markets",
    label: "Markets",
    queries: [
      "markets inflation rates treasury earnings",
      "stocks bonds commodities currency risk",
    ],
  },
  {
    topic: "business",
    label: "Business",
    queries: [
      "business strategy M&A enterprise software logistics",
      "CEO layoffs hiring pricing expansion margin",
    ],
  },
  {
    topic: "cpg-startups",
    label: "CPG Startups",
    queries: [
      "CPG startups grocery retail beverage snack funding distribution",
      "consumer packaged goods startup retail shelf expansion margin brand",
    ],
  },
  {
    topic: "cannabis",
    label: "Cannabis",
    queries: [
      "cannabis regulation operators pricing dispensaries",
      "cannabis rescheduling hemp retail enforcement",
    ],
  },
  {
    topic: "chicago",
    label: "Chicago",
    queries: [
      "Chicago business policy transit real estate startups",
      "Chicago mayor downtown crime economic development",
    ],
  },
  {
    topic: "colorado",
    label: "Colorado",
    queries: [
      "Colorado business policy energy startups cannabis",
      "Denver Boulder Colorado economy regulation",
    ],
  },
  {
    topic: "asymmetric-upside",
    label: "Asymmetric Upside",
    queries: [
      "robotics industrial autonomy warehouse humanoid startup",
      "small modular nuclear geothermal grid storage defense tech",
    ],
  },
];

interface SportsConfig {
  sportsArea: SportsArea;
  label: string;
  queries: string[];
}

export const SPORTS_CONFIG: SportsConfig[] = [
  {
    sportsArea: "denver-broncos",
    label: "Denver Broncos",
    queries: [
      "\"Denver Broncos\"",
    ],
  },
  {
    sportsArea: "colorado-buffaloes-football",
    label: "Colorado Buffaloes Football",
    queries: [
      "\"Colorado Buffaloes\" football",
    ],
  },
  {
    sportsArea: "notre-dame-football",
    label: "Notre Dame Football",
    queries: [
      "\"Notre Dame\" football",
    ],
  },
  {
    sportsArea: "tennis",
    label: "ATP + WTA Tennis",
    queries: [
      "ATP WTA tennis",
    ],
  },
];

export function getTopicLabel(topic: ResearchTopic): string {
  return TOPIC_CONFIG.find((entry) => entry.topic === topic)?.label ?? topic;
}

export function getSportsLabel(sportsArea: SportsArea): string {
  return SPORTS_CONFIG.find((entry) => entry.sportsArea === sportsArea)?.label ?? sportsArea;
}

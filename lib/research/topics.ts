import type { ResearchTopic } from "@/lib/briefing/types";

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
      "artificial intelligence frontier models chips regulation",
      "OpenAI Anthropic Google Microsoft AI enterprise",
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

export function getTopicLabel(topic: ResearchTopic): string {
  return TOPIC_CONFIG.find((entry) => entry.topic === topic)?.label ?? topic;
}

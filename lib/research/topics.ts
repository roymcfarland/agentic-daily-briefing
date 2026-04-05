import type { ResearchTopic, SportsArea } from "@/lib/briefing/types";

interface TopicConfig {
  topic: ResearchTopic;
  label: string;
  queries: string[];
}

const AI_QUERIES = [
  "enterprise AI agents MCP model context protocol inference GPUs site:venturebeat.com OR site:semafor.com",
  "LLM infrastructure enterprise deployment inference GPUs site:theinformation.com OR site:nvidia.com OR site:techcrunch.com",
  "OpenAI Anthropic Google Microsoft agents enterprise site:openai.com OR site:anthropic.com OR site:venturebeat.com",
];

const CPG_STARTUP_QUERIES = [
  "nutrition startup wellness biotech food tech funding site:foodnavigator-usa.com OR site:nutraingredients.com OR site:agfundernews.com",
  "beverage snack supplement startup retail launch site:bevnet.com OR site:newhope.com OR site:foodbusinessnews.net",
  "consumer wellness biotech startup clinical nutrition site:fiercebiotech.com OR site:statnews.com OR site:nutraingredients.com",
];

const CANNABIS_QUERIES = [
  "cannabis regulation operators pricing dispensaries site:mjbizdaily.com OR site:greenmarketreport.com OR site:marijuanamoment.net",
  "cannabis rescheduling hemp retail enforcement site:cannabisbusinesstimes.com OR site:newcannabisventures.com OR site:mjbizdaily.com",
];

export const TOPIC_CONFIG: TopicConfig[] = [
  {
    topic: "ai",
    label: "AI",
    queries: AI_QUERIES,
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
    queries: CPG_STARTUP_QUERIES,
  },
  {
    topic: "cannabis",
    label: "Cannabis",
    queries: CANNABIS_QUERIES,
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
  requiredKeywords: string[];
}

export const SPORTS_CONFIG: SportsConfig[] = [
  {
    sportsArea: "denver-broncos",
    label: "Denver Broncos",
    queries: [
      "\"Denver Broncos\" OR Broncos offseason OR Broncos draft site:denverbroncos.com OR site:espn.com OR site:apnews.com",
    ],
    requiredKeywords: ["broncos", "denver broncos", "broncos draft", "broncos offseason"],
  },
  {
    sportsArea: "colorado-buffaloes-football",
    label: "Colorado Buffaloes Football",
    queries: [
      "\"Colorado Buffaloes\" football OR Deion Sanders OR Buffs spring football site:cubuffs.com OR site:espn.com OR site:apnews.com",
    ],
    requiredKeywords: ["colorado buffaloes", "buffaloes football", "deion sanders", "buffs spring football", "cu buffs football"],
  },
  {
    sportsArea: "notre-dame-football",
    label: "Notre Dame Football",
    queries: [
      "\"Notre Dame football\" OR Fighting Irish football OR Notre Dame spring football site:fightingirish.com OR site:espn.com OR site:apnews.com",
    ],
    requiredKeywords: ["notre dame football", "fighting irish football", "notre dame spring football"],
  },
  {
    sportsArea: "tennis",
    label: "ATP + WTA Tennis",
    queries: [
      "ATP WTA tennis site:atptour.com OR site:wtatennis.com OR site:espn.com",
    ],
    requiredKeywords: ["atp", "wta", "tennis", "monte-carlo", "indian wells", "miami open"],
  },
];

export function getTopicLabel(topic: ResearchTopic): string {
  return TOPIC_CONFIG.find((entry) => entry.topic === topic)?.label ?? topic;
}

export function getSportsLabel(sportsArea: SportsArea): string {
  return SPORTS_CONFIG.find((entry) => entry.sportsArea === sportsArea)?.label ?? sportsArea;
}

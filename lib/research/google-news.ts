import { XMLParser } from "fast-xml-parser";

import type { ResearchTopic, StoryCandidate } from "@/lib/briefing/types";

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
});

interface RssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  source?: string | { "#text"?: string };
  description?: string;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function cleanDescription(input: string | undefined): string {
  if (!input) {
    return "";
  }

  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^-\s*/, "")
    .trim();
}

function getSourceName(source: RssItem["source"]): string {
  if (!source) {
    return "Google News";
  }

  return typeof source === "string" ? source : source["#text"] || "Google News";
}

export async function fetchGoogleNewsStories(
  topic: ResearchTopic,
  query: string,
): Promise<StoryCandidate[]> {
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");

  const response = await fetch(url.toString(), {
    headers: {
      "user-agent": "weekday-morning-brief/1.0",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Google News RSS failed for ${topic}: ${response.status}`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml) as {
    rss?: { channel?: { item?: RssItem | RssItem[] } };
  };

  return toArray(parsed.rss?.channel?.item)
    .map((item) => ({
      topic,
      title: item.title?.replace(/\s+-\s+[^-]+$/, "").trim() ?? "",
      summary: cleanDescription(item.description),
      source: getSourceName(item.source),
      url: item.link ?? "",
      publishedAt: item.pubDate,
    }))
    .filter((item) => item.title && item.url);
}

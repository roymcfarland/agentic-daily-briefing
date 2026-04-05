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

const FETCH_TIMEOUT_MS = 12000;

function decodeEntities(input: string): string {
  return input
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
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

  return decodeEntities(input)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+&nbsp;\s+[^\s]+$/i, "")
    .replace(/\s+/g, " ")
    .replace(/^-\s*/, "")
    .trim();
}

function cleanText(input: string | undefined): string {
  if (!input) {
    return "";
  }

  return decodeEntities(input)
    .replace(/\s+/g, " ")
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const response = await fetch(url.toString(), {
    headers: {
      "user-agent": "weekday-morning-brief/1.0",
      accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.1",
    },
    next: { revalidate: 0 },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw new Error(`Google News RSS failed for ${topic}: ${response.status}`);
  }

  const xml = await response.text();
  let parsed: {
    rss?: { channel?: { item?: RssItem | RssItem[] } };
  };

  try {
    parsed = parser.parse(xml) as {
      rss?: { channel?: { item?: RssItem | RssItem[] } };
    };
  } catch {
    throw new Error(`Google News RSS returned malformed XML for ${topic}`);
  }

  return toArray(parsed.rss?.channel?.item)
    .map((item) => ({
      topic,
      title: cleanText(item.title?.replace(/\s+-\s+[^-]+$/, "")),
      summary: cleanDescription(item.description),
      source: cleanText(getSourceName(item.source)),
      url: cleanText(item.link),
      publishedAt: item.pubDate,
    }))
    .filter((item) => item.title && item.url.startsWith("https://"));
}

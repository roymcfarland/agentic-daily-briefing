import { decodeEntities } from "@/lib/research/decode-entities";

const FETCH_TIMEOUT_MS = 8000;
const MAX_ARTICLE_BYTES = 2_000_000;
const MAX_TEXT_LENGTH = 8000;

function extractReadableText(html: string): string {
  const withoutScripts = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script(?:[\t\n\f\r /][^>]{0,256})?>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style(?:[\t\n\f\r /][^>]{0,256})?>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript(?:[\t\n\f\r /][^>]{0,256})?>/gi, " ");

  // No tag can match beyond the final >. Keep that suffix out of the tag scan.
  const tagScanEnd = withoutScripts.lastIndexOf(">") + 1;
  const withoutTags =
    withoutScripts.slice(0, tagScanEnd).replace(/<[^>]+>/g, " ") +
    withoutScripts.slice(tagScanEnd);

  return decodeEntities(withoutTags)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

/**
 * Fetches an article URL and returns extracted plain text, capped at
 * MAX_TEXT_LENGTH. Never throws: any failure (bad URL, timeout, non-OK,
 * non-HTML, oversized body) returns "". Callers fall back to the RSS summary.
 */
export async function fetchArticleText(url: string): Promise<string> {
  if (!url.startsWith("https://")) {
    return "";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "user-agent": "weekday-morning-brief/1.0",
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    return "";
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("text/html")) {
    return "";
  }

  const contentLength = Number.parseInt(response.headers.get("content-length") ?? "", 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_ARTICLE_BYTES) {
    return "";
  }

  let html: string;
  try {
    html = await response.text();
  } catch {
    return "";
  }

  if (html.length > MAX_ARTICLE_BYTES) {
    return "";
  }

  return extractReadableText(html);
}

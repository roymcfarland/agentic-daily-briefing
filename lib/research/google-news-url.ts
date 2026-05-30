const FETCH_TIMEOUT_MS = 8000;
const GOOGLE_NEWS_HOST = "news.google.com";
const BATCH_URL = "https://news.google.com/_/DotsSplashUi/data/batchexecute";
const BROWSER_UA =
  "Mozilla/5.0 (compatible; weekday-morning-brief/1.0; +https://roymcfarland.news)";

interface Signature {
  id: string;
  sg: string;
  ts: string;
}

function isGoogleNewsArticleUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === GOOGLE_NEWS_HOST && parsed.pathname.includes("/articles/");
  } catch {
    return false;
  }
}

function extractSignature(html: string): Signature | null {
  const id = html.match(/data-n-a-id="([^"]+)"/)?.[1];
  const sg = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
  const ts = html.match(/data-n-a-ts="([^"]+)"/)?.[1];

  return id && sg && ts ? { id, sg, ts } : null;
}

function buildBatchBody({ id, sg, ts }: Signature): string {
  const inner = JSON.stringify([
    "garturlreq",
    [
      [
        "X",
        "X",
        ["X", "X"],
        null,
        null,
        1,
        1,
        "US:en",
        null,
        1,
        null,
        null,
        null,
        null,
        null,
        0,
        1,
      ],
      "X",
      "X",
      1,
      [1, 1, 1],
      1,
      1,
      null,
      0,
      0,
      null,
      0,
    ],
    id,
    Number(ts),
    sg,
  ]);
  const freq = JSON.stringify([[["Fbv4je", inner, null, "generic"]]]);

  return `f.req=${encodeURIComponent(freq)}`;
}

function parseDecodedUrl(responseText: string): string | null {
  const cleaned = responseText.replace(/^\)\]\}'\n?/, "");
  const line = cleaned.split("\n").find((item) => item.includes("garturlres") || item.includes("http"));

  if (!line) {
    return null;
  }

  try {
    const outer = JSON.parse(line);
    const payload = JSON.parse(outer[0][2]);
    const url = payload[1];

    return typeof url === "string" && url.startsWith("http") ? url : null;
  } catch {
    return null;
  }
}

/**
 * Resolves a Google News rss/articles redirect URL to the real publisher URL.
 * Non-Google-News URLs are returned unchanged. Never throws: on any failure,
 * the original URL is returned so downstream callers keep their RSS fallback.
 */
export async function resolveArticleUrl(url: string): Promise<string> {
  if (!isGoogleNewsArticleUrl(url)) {
    return url;
  }

  try {
    const pageRes = await fetch(url, {
      headers: { "user-agent": BROWSER_UA },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!pageRes.ok) {
      return url;
    }

    const signature = extractSignature(await pageRes.text());
    if (!signature) {
      return url;
    }

    const batchRes = await fetch(BATCH_URL, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        "user-agent": BROWSER_UA,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      body: buildBatchBody(signature),
    });

    if (!batchRes.ok) {
      return url;
    }

    return parseDecodedUrl(await batchRes.text()) ?? url;
  } catch {
    return url;
  }
}

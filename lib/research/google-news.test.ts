import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchGoogleNewsStories } from "@/lib/research/google-news";

function stubGoogleNewsFeed(xml: string): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      text: async () => xml,
    }),
  );
}

describe("fetchGoogleNewsStories", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("cleans summary text and strips trailing source names", async () => {
    stubGoogleNewsFeed(`<?xml version="1.0"?>
          <rss>
            <channel>
              <item>
                <title>AI infrastructure update - Reuters</title>
                <link>https://example.com/story</link>
                <pubDate>Fri, 03 Apr 2026 12:00:00 GMT</pubDate>
                <source>Reuters</source>
                <description><![CDATA[AI infrastructure update &nbsp;&nbsp; Reuters]]></description>
              </item>
            </channel>
          </rss>`);

    const stories = await fetchGoogleNewsStories("ai", "ai infrastructure");

    expect(stories).toEqual([
      {
        topic: "ai",
        title: "AI infrastructure update",
        summary: "AI infrastructure update",
        source: "Reuters",
        url: "https://example.com/story",
        publishedAt: "Fri, 03 Apr 2026 12:00:00 GMT",
      },
    ]);
  });

  it("drops non-https links from the parsed feed", async () => {
    stubGoogleNewsFeed(`<?xml version="1.0"?>
          <rss>
            <channel>
              <item>
                <title>Unsafe link story</title>
                <link>javascript:alert(1)</link>
                <source>Example</source>
                <description>Unsafe link story</description>
              </item>
            </channel>
          </rss>`);

    const stories = await fetchGoogleNewsStories("business", "unsafe");
    expect(stories).toEqual([]);
  });

  it("strips markup from titles and sources without changing URLs", async () => {
    stubGoogleNewsFeed(`<?xml version="1.0"?>
          <rss>
            <channel>
              <item>
                <title><![CDATA[<b>Big News</b> - Example Wire]]></title>
                <link>https://example.com/plain-story?utm_source=news</link>
                <source><![CDATA[<i>Example Wire</i>]]></source>
                <description>Big News Example Wire</description>
              </item>
              <item>
                <title>&lt;img src=x&gt;Encoded headline</title>
                <link>https://example.com/encoded-story</link>
                <source>Example</source>
                <description>Encoded headline</description>
              </item>
            </channel>
          </rss>`);

    const stories = await fetchGoogleNewsStories("ai", "markup");

    expect(stories).toEqual([
      {
        topic: "ai",
        title: "Big News",
        summary: "Big News",
        source: "Example Wire",
        url: "https://example.com/plain-story?utm_source=news",
        publishedAt: undefined,
      },
      {
        topic: "ai",
        title: "Encoded headline",
        summary: "Encoded headline",
        source: "Example",
        url: "https://example.com/encoded-story",
        publishedAt: undefined,
      },
    ]);
  });

  it("leaves plain titles unchanged", async () => {
    stubGoogleNewsFeed(`<?xml version="1.0"?>
          <rss>
            <channel>
              <item>
                <title>Markets rally after earnings surprise</title>
                <link>https://example.com/markets</link>
                <source>Example</source>
                <description>Markets rally after earnings surprise</description>
              </item>
            </channel>
          </rss>`);

    const stories = await fetchGoogleNewsStories("markets", "earnings");

    expect(stories[0]?.title).toBe("Markets rally after earnings surprise");
  });

  it("throws a clear error for malformed XML", async () => {
    stubGoogleNewsFeed("not actually xml");

    await expect(fetchGoogleNewsStories("markets", "malformed")).rejects.toThrow(
      "Google News RSS returned malformed XML for markets",
    );
  });
});

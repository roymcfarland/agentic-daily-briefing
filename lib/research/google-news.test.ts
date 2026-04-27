import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchGoogleNewsStories } from "@/lib/research/google-news";

describe("fetchGoogleNewsStories", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("cleans summary text and strips trailing source names", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: async () => `<?xml version="1.0"?>
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
          </rss>`,
      }),
    );

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
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: async () => `<?xml version="1.0"?>
          <rss>
            <channel>
              <item>
                <title>Unsafe link story</title>
                <link>javascript:alert(1)</link>
                <source>Example</source>
                <description>Unsafe link story</description>
              </item>
            </channel>
          </rss>`,
      }),
    );

    const stories = await fetchGoogleNewsStories("business", "unsafe");
    expect(stories).toEqual([]);
  });

  it("throws a clear error for malformed XML", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: async () => "not actually xml",
      }),
    );

    await expect(fetchGoogleNewsStories("markets", "malformed")).rejects.toThrow(
      "Google News RSS returned malformed XML for markets",
    );
  });
});

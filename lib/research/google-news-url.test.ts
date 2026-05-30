import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveArticleUrl } from "@/lib/research/google-news-url";

const GN_URL = "https://news.google.com/rss/articles/CBMiABC123?oc=5";
const PAGE_HTML =
  '<c-wiz data-n-a-id="CBMiABC123FULL" data-n-a-sg="SIG123" data-n-a-ts="1700000000"></c-wiz>';
const BATCH_OK =
  ')]}\'\n\n[["wrb.fr","Fbv4je","[\\"garturlres\\",\\"https://www.publisher.example/real-article\\"]",null,null,null,"generic"]]';

function response(body: string, ok = true): Response {
  return { ok, text: async () => body } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveArticleUrl", () => {
  it("passes through non-Google-News URLs without fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveArticleUrl("https://example.com/story")).resolves.toBe(
      "https://example.com/story",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("decodes a Google News article URL to the publisher URL", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(PAGE_HTML))
      .mockResolvedValueOnce(response(BATCH_OK));
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveArticleUrl(GN_URL)).resolves.toBe(
      "https://www.publisher.example/real-article",
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://news.google.com/_/DotsSplashUi/data/batchexecute",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns the original URL when signature attributes are missing", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response("<html></html>"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveArticleUrl(GN_URL)).resolves.toBe(GN_URL);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns the original URL when the page response is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response("nope", false));
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveArticleUrl(GN_URL)).resolves.toBe(GN_URL);
  });

  it("returns the original URL when the batchexecute response is not ok", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(PAGE_HTML))
      .mockResolvedValueOnce(response("nope", false));
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveArticleUrl(GN_URL)).resolves.toBe(GN_URL);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns the original URL when the batchexecute response cannot be parsed", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(PAGE_HTML))
      .mockResolvedValueOnce(response("not the expected structure"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveArticleUrl(GN_URL)).resolves.toBe(GN_URL);
  });

  it("returns the original URL when fetch rejects", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("network failed"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveArticleUrl(GN_URL)).resolves.toBe(GN_URL);
  });
});

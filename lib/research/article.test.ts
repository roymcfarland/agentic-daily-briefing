import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchArticleText } from "@/lib/research/article";

function stubArticleResponse(
  body: string,
  init: {
    contentType?: string;
    ok?: boolean;
    headers?: Record<string, string>;
  } = {},
): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: init.ok ?? true,
      headers: new Headers({
        "content-type": init.contentType ?? "text/html",
        ...init.headers,
      }),
      text: async () => body,
    }),
  );
}

describe("fetchArticleText", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("extracts paragraph text from an HTML body", async () => {
    stubArticleResponse("<html><body><p>Hello world</p><p>Second para</p></body></html>");

    const text = await fetchArticleText("https://example.com/story");

    expect(text).toContain("Hello world");
    expect(text).toContain("Second para");
    expect(text).not.toContain("<");
  });

  it("strips script and style contents", async () => {
    stubArticleResponse(`
      <html>
        <head><style>.hidden { color: red; }</style></head>
        <body>
          <script>window.secret = "tracking";</script>
          <p>Visible story text</p>
        </body>
      </html>
    `);

    const text = await fetchArticleText("https://example.com/story");

    expect(text).toContain("Visible story text");
    expect(text).not.toContain("window.secret");
    expect(text).not.toContain(".hidden");
  });

  it("returns an empty string when the response is not OK", async () => {
    stubArticleResponse("not found", { ok: false });

    await expect(fetchArticleText("https://example.com/missing")).resolves.toBe("");
  });

  it("returns an empty string when the content type is not HTML", async () => {
    stubArticleResponse("%PDF", { contentType: "application/pdf" });

    await expect(fetchArticleText("https://example.com/file.pdf")).resolves.toBe("");
  });

  it("returns an empty string when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(fetchArticleText("https://example.com/story")).resolves.toBe("");
  });

  it("returns an empty string when fetch aborts", async () => {
    const error = new Error("aborted");
    error.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));

    await expect(fetchArticleText("https://example.com/story")).resolves.toBe("");
  });

  it("returns an empty string when the content length is too large", async () => {
    const readBody = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({
          "content-type": "text/html",
          "content-length": "2000001",
        }),
        text: readBody,
      }),
    );

    await expect(fetchArticleText("https://example.com/large-story")).resolves.toBe("");
    expect(readBody).not.toHaveBeenCalled();
  });

  it("returns an empty string when reading the body fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "text/html" }),
        text: vi.fn().mockRejectedValue(new Error("stream failed")),
      }),
    );

    await expect(fetchArticleText("https://example.com/story")).resolves.toBe("");
  });

  it("returns an empty string for non-HTTPS URLs without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchArticleText("http://example.com/story")).resolves.toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("caps visible output at the maximum text length", async () => {
    stubArticleResponse(`<html><body><p>${"a".repeat(9000)}</p></body></html>`);

    const text = await fetchArticleText("https://example.com/long-story");

    expect(text).toHaveLength(8000);
  });

  it("returns an empty string when the HTML body is too large", async () => {
    stubArticleResponse("a".repeat(2_000_001));

    await expect(fetchArticleText("https://example.com/oversized-story")).resolves.toBe("");
  });
});

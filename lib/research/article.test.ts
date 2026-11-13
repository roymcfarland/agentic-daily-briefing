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

  it.each([
    ["exact spelling", "</script>"],
    ["uppercase", "</SCRIPT>"],
    ["space", "</script >"],
    ["tab", "</script\t>"],
    ["newline", "</script\n>"],
    ["form feed", "</script\f>"],
    ["carriage return", "</script\r>"],
    ["slash", "</script/>"],
    ["an attribute", '</script foo="bar">'],
  ])("strips script contents when the closing tag uses %s", async (_variant, closingTag) => {
    stubArticleResponse(`<script type="text/javascript">Hidden text${closingTag}<p>Story</p>`);

    await expect(fetchArticleText("https://example.com/story")).resolves.toBe("Story");
  });

  it.each([
    ["a longer tag name", "</scripts>"],
    ["a nonbreaking space", "</script\u00a0>"],
  ])("keeps stripping until the real closing tag after %s", async (_variant, falseClosingTag) => {
    stubArticleResponse(`<script>First hidden text${falseClosingTag}More hidden text</script><p>Story</p>`);

    await expect(fetchArticleText("https://example.com/story")).resolves.toBe("Story");
  });

  it("strips style and noscript contents when the closing tags contain whitespace", async () => {
    stubArticleResponse("<style>Hidden style</style ><noscript>Hidden fallback</noscript\n><p>Story</p>");

    await expect(fetchArticleText("https://example.com/story")).resolves.toBe("Story");
  });

  it("preserves literal entities in doubly encoded text", async () => {
    stubArticleResponse("<p>&amp;lt;b&amp;gt;</p>");

    await expect(fetchArticleText("https://example.com/story")).resolves.toBe("&lt;b&gt;");
  });

  it("decodes ordinary entities after stripping tags", async () => {
    stubArticleResponse("<p>&quot;A&nbsp;&amp;&nbsp;B&#39;s &lt;C&gt;&quot;</p>");

    await expect(fetchArticleText("https://example.com/story")).resolves.toBe(`"A & B's <C>"`);
  });

  it("preserves text and decodes entities after the final tag delimiter", async () => {
    stubArticleResponse("<p>Story</p> &amp; <unfinished <unfinished");

    await expect(fetchArticleText("https://example.com/story")).resolves.toBe(
      "Story & <unfinished <unfinished",
    );
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

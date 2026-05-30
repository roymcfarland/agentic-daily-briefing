import { describe, expect, it } from "vitest";

import { escapeHtml, sanitizeUrl } from "@/lib/html";

describe("sanitizeUrl", () => {
  it.each([
    ["https://example.com/x?a=1", "https://example.com/x?a=1"],
    ["http://example.com", "http://example.com"],
    ["javascript:alert(1)", "#"],
    ["data:text/html,<script>", "#"],
    ["vbscript:msgbox(1)", "#"],
    ["not a url", "#"],
    ["/relative/path", "#"],
  ])("sanitizes %s", (value, expected) => {
    expect(sanitizeUrl(value)).toBe(expected);
  });
});

describe("escapeHtml", () => {
  it("escapes HTML-sensitive characters", () => {
    expect(escapeHtml(`<script>alert("x" & 'y')</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot; &amp; &#39;y&#39;)&lt;/script&gt;",
    );
  });
});

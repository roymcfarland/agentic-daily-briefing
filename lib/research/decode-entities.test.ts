import { describe, expect, it } from "vitest";

import { decodeEntities } from "@/lib/research/decode-entities";

describe("decodeEntities", () => {
  it.each([
    ["&nbsp;", " "],
    ["&amp;", "&"],
    ["&quot;", '"'],
    ["&#39;", "'"],
    ["&lt;", "<"],
    ["&gt;", ">"],
  ])("decodes %s", (input, expected) => {
    expect(decodeEntities(input)).toBe(expected);
  });

  it("decodes mixed entities in a single string", () => {
    expect(decodeEntities("&quot;A&nbsp;&amp;&nbsp;B&#39;s &lt;C&gt;&quot;"))
      .toBe(`"A & B's <C>"`);
  });

  it.each([
    ["&amp;lt;", "&lt;"],
    ["&amp;amp;", "&amp;"],
    ["&amp;nbsp;", "&nbsp;"],
    ["&amp;#39;", "&#39;"],
  ])("decodes %s only once", (input, expected) => {
    expect(decodeEntities(input)).toBe(expected);
  });

  it("preserves an empty string", () => {
    expect(decodeEntities("")).toBe("");
  });

  it("preserves text without entities", () => {
    expect(decodeEntities("A & B")).toBe("A & B");
  });

  it("preserves unsupported entities", () => {
    expect(decodeEntities("&copy; &apos; &#60; &#x3c; &AMP;"))
      .toBe("&copy; &apos; &#60; &#x3c; &AMP;");
  });
});

import { describe, expect, it } from "vitest";

import { normalizeText } from "@/lib/briefing/text-utils";

describe("normalizeText", () => {
  it("normalizes ampersands, punctuation, and case", () => {
    expect(normalizeText("Apple & Google: AI!")).toBe("apple and google ai");
  });

  it("collapses repeated punctuation and spaces", () => {
    expect(normalizeText("  Mixed CASE...with\tmultiple   spaces  ")).toBe("mixed case with multiple spaces");
  });

  it("returns an empty string for empty or whitespace-only input", () => {
    expect(normalizeText("")).toBe("");
    expect(normalizeText(" \t\n ")).toBe("");
  });

  it("preserves stopwords for downstream canonicalization", () => {
    expect(normalizeText("the cat")).toBe("the cat");
  });
});

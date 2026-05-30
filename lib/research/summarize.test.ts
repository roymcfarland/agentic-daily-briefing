import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { generateTextMock } = vi.hoisted(() => ({ generateTextMock: vi.fn() }));
vi.mock("ai", () => ({ generateText: generateTextMock }));

import { summarizeArticle } from "@/lib/research/summarize";

const LONG_ARTICLE = "x".repeat(400);
const FALLBACK = "RSS fallback.";
const ENV_KEYS = ["BRIEFING_SUMMARIES_ENABLED", "BRIEFING_SUMMARY_MODEL"] as const;

type EnvKey = (typeof ENV_KEYS)[number];

function summarize(overrides: Partial<Parameters<typeof summarizeArticle>[0]> = {}) {
  return summarizeArticle({
    title: "A useful story",
    source: "Example News",
    articleText: LONG_ARTICLE,
    fallback: FALLBACK,
    ...overrides,
  });
}

describe("summarizeArticle", () => {
  let originalEnv: Record<EnvKey, string | undefined>;

  beforeEach(() => {
    originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]])) as Record<
      EnvKey,
      string | undefined
    >;
    generateTextMock.mockReset();
    ENV_KEYS.forEach((key) => delete process.env[key]);
  });

  afterEach(() => {
    ENV_KEYS.forEach((key) => {
      const value = originalEnv[key];
      if (value === undefined) {
        delete process.env[key];
        return;
      }

      process.env[key] = value;
    });
  });

  it("returns the model summary for long article text", async () => {
    generateTextMock.mockResolvedValue({ text: "A tidy summary." });

    await expect(summarize()).resolves.toBe("A tidy summary.");
  });

  it("returns the fallback for empty article text without calling the model", async () => {
    await expect(summarize({ articleText: "" })).resolves.toBe(FALLBACK);
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("returns the fallback for too-thin article text without calling the model", async () => {
    await expect(summarize({ articleText: "short article" })).resolves.toBe(FALLBACK);
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("returns the fallback without calling the model when summaries are disabled", async () => {
    process.env.BRIEFING_SUMMARIES_ENABLED = "false";

    await expect(summarize()).resolves.toBe(FALLBACK);
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("returns the fallback when the model rejects", async () => {
    generateTextMock.mockRejectedValue(new Error("gateway unavailable"));

    await expect(summarize()).resolves.toBe(FALLBACK);
  });

  it("returns the fallback when the model output is empty", async () => {
    generateTextMock.mockResolvedValue({ text: "   " });

    await expect(summarize()).resolves.toBe(FALLBACK);
  });

  it("uses the default summary model", async () => {
    generateTextMock.mockResolvedValue({ text: "A tidy summary." });

    await summarize();

    expect(generateTextMock.mock.calls[0][0].model).toBe("openai/gpt-5.4-mini");
  });

  it("uses the env summary model override", async () => {
    process.env.BRIEFING_SUMMARY_MODEL = "openai/gpt-5.4";
    generateTextMock.mockResolvedValue({ text: "A tidy summary." });

    await summarize();

    expect(generateTextMock.mock.calls[0][0].model).toBe("openai/gpt-5.4");
  });
});

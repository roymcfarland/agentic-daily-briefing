import { generateText } from "ai";

const DEFAULT_SUMMARY_MODEL = "openai/gpt-5.4-mini";
const SUMMARY_TIMEOUT_MS = 12000;
const MIN_ARTICLE_TEXT_LENGTH = 200;
const MAX_ARTICLE_TEXT_LENGTH = 6000;
const MAX_SUMMARY_OUTPUT_TOKENS = 220;

const SYSTEM_PROMPT =
  "You write concise factual summaries for a busy founder's morning news brief. " +
  "Summarize the article in 2-3 plain sentences. Use ONLY facts stated in the provided text — " +
  "do not speculate, editorialize, or add outside context. Return the summary only, with no preamble or labels.";

export interface SummarizeArticleInput {
  title: string;
  source: string;
  articleText: string;
  fallback: string;
}

function summariesEnabled(): boolean {
  return process.env.BRIEFING_SUMMARIES_ENABLED?.trim().toLowerCase() !== "false";
}

function getSummaryModel(): string {
  return process.env.BRIEFING_SUMMARY_MODEL?.trim() || DEFAULT_SUMMARY_MODEL;
}

/**
 * Produces a short, article-grounded summary via the Vercel AI Gateway.
 * Never throws: if summaries are disabled, the article text is too thin, or the
 * model call fails / times out / returns empty, the provided `fallback` is returned.
 */
export async function summarizeArticle(input: SummarizeArticleInput): Promise<string> {
  const articleText = input.articleText.trim();
  if (!summariesEnabled() || articleText.length < MIN_ARTICLE_TEXT_LENGTH) {
    return input.fallback;
  }

  const prompt = [
    `Title: ${input.title}`,
    `Source: ${input.source}`,
    "",
    "Article:",
    articleText.slice(0, MAX_ARTICLE_TEXT_LENGTH),
  ].join("\n");

  try {
    const { text } = await generateText({
      model: getSummaryModel(),
      system: SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: MAX_SUMMARY_OUTPUT_TOKENS,
      abortSignal: AbortSignal.timeout(SUMMARY_TIMEOUT_MS),
    });

    const summary = text.trim();
    return summary.length > 0 ? summary : input.fallback;
  } catch {
    return input.fallback;
  }
}

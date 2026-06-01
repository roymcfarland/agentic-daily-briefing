import type { RankedStory } from "@/lib/briefing/types";
import { fetchArticleText as defaultFetchArticleText } from "@/lib/research/article";
import { resolveArticleUrl as defaultResolveArticleUrl } from "@/lib/research/google-news-url";
import { summarizeArticle as defaultSummarizeArticle } from "@/lib/research/summarize";

export interface EnrichDeps {
  resolveArticleUrl: (url: string) => Promise<string>;
  fetchArticleText: (url: string) => Promise<string>;
  summarizeArticle: (input: {
    title: string;
    source: string;
    articleText: string;
    fallback: string;
  }) => Promise<string>;
}

const DEFAULT_DEPS: EnrichDeps = {
  resolveArticleUrl: defaultResolveArticleUrl,
  fetchArticleText: defaultFetchArticleText,
  summarizeArticle: defaultSummarizeArticle,
};

/**
 * Replaces each selected story's `summary` with an article-grounded summary.
 * Never throws or drops stories; failures keep the original RSS summary.
 */
export async function enrichStoriesWithSummaries(
  stories: RankedStory[],
  deps: EnrichDeps = DEFAULT_DEPS,
): Promise<RankedStory[]> {
  const enriched = await Promise.all(
    stories.map(async (story) => {
      try {
        const articleUrl = await deps.resolveArticleUrl(story.url);
        const articleText = await deps.fetchArticleText(articleUrl);
        const summary = await deps.summarizeArticle({
          title: story.title,
          source: story.source,
          articleText,
          fallback: story.summary,
        });

        return { ...story, summary };
      } catch {
        return story;
      }
    }),
  );

  logEnrichmentOutcome(stories, enriched);

  return enriched;
}

/**
 * Emits one structured log line with the enrichment hit-rate so a silent decode
 * break (summaries reverting to the one-line RSS blurb) is visible in prod logs.
 * A story counts as enriched when its summary changed from the original RSS
 * fallback; an unchanged summary means summarizeArticle fell back (disabled,
 * thin text, paywall, or model error). `enriched: 0` is the alarm.
 */
function logEnrichmentOutcome(
  original: RankedStory[],
  enriched: RankedStory[],
): void {
  const total = original.length;
  if (total === 0) {
    return;
  }

  const enrichedCount = enriched.reduce(
    (count, story, index) =>
      story.summary !== original[index].summary ? count + 1 : count,
    0,
  );

  console.info("Briefing enrichment", {
    total,
    enriched: enrichedCount,
    fallback: total - enrichedCount,
    enrichedPct: Math.round((enrichedCount / total) * 100),
  });
}

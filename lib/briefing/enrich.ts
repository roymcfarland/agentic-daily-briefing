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
  return Promise.all(
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
}

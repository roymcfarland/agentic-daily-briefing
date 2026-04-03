import { getEnv } from "@/lib/env";
import type { CoverageArea, TaskSummary } from "@/lib/briefing/types";
import { TaskflowClient } from "@/lib/taskflow/generated/client";

const AREAS: CoverageArea[] = [
  "personal",
  "elevated-organics",
  "brightline-labs",
];

function getAsOfDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export async function getTaskSummaries(now: Date): Promise<TaskSummary[]> {
  const env = getEnv();
  const client = new TaskflowClient({
    baseUrl: env.taskflowApiBaseUrl,
    apiKey: env.taskflowApiKey,
    timeoutMs: env.taskflowTimeoutMs,
  });
  const asOfDate = getAsOfDate(now);

  const summaries = await Promise.all(
    AREAS.map((area) =>
      client.getDailySummary({
        area,
        asOfDate,
      }),
    ),
  );

  return summaries.map((summary) => ({
    area: summary.area as CoverageArea,
    headline: summary.headline,
    openItems: summary.openItems,
    blockers: summary.blockers,
    priorities: summary.priorities,
    dueToday: summary.dueToday,
    rawSummary: summary.rawSummary,
  }));
}

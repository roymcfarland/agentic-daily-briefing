import { getEnv } from "@/lib/env";
import type { CoverageArea, TaskSummary } from "@/lib/briefing/types";
import { TaskflowClient, type Task } from "@/lib/taskflow/generated/client";

const AREAS: CoverageArea[] = [
  "personal",
  "elevated-organics",
  "brightline-labs",
];

function normalizeCategory(category?: string): CoverageArea | null {
  if (
    category === "personal" ||
    category === "elevated-organics" ||
    category === "brightline-labs"
  ) {
    return category;
  }

  return null;
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((left, right) => {
    const leftSort = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const rightSort = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (leftSort !== rightSort) {
      return leftSort - rightSort;
    }

    return (left.title ?? "").localeCompare(right.title ?? "");
  });
}

function toTitles(tasks: Task[]): string[] {
  return sortTasks(tasks)
    .map((task) => task.title?.trim())
    .filter((value): value is string => Boolean(value));
}

function byArea(tasks: Task[] | undefined): Record<CoverageArea, Task[]> {
  const grouped: Record<CoverageArea, Task[]> = {
    personal: [],
    "elevated-organics": [],
    "brightline-labs": [],
  };

  for (const task of tasks ?? []) {
    const area = normalizeCategory(task.category);
    if (area) {
      grouped[area].push(task);
    }
  }

  return grouped;
}

function createHeadline(area: CoverageArea, openItems: number, inProgress: number, dueToday: number): string {
  const label =
    area === "personal"
      ? "Personal"
      : area === "elevated-organics"
        ? "Elevated Organics"
        : "Brightline Labs";

  return `${label}: ${openItems} active items, ${inProgress} in progress, ${dueToday} recently completed`;
}

export async function getTaskSummaries(now: Date): Promise<TaskSummary[]> {
  const env = getEnv();
  const client = new TaskflowClient({
    baseUrl: env.taskflowApiBaseUrl,
    apiKey: env.taskflowApiKey,
    timeoutMs: env.taskflowTimeoutMs,
  });
  void now;

  const summary = await client.getDailySummary();
  const inProgressByArea = byArea(summary.inProgress);
  const onDeckByArea = byArea(summary.onDeck);
  const iceBoxByArea = byArea(summary.iceBox);
  const recentlyCompletedByArea = byArea(summary.recentlyCompleted);

  return AREAS.map((area) => {
    const priorities = toTitles(onDeckByArea[area]).slice(0, 5);
    const blockers = toTitles(iceBoxByArea[area]).slice(0, 5);
    const dueToday = toTitles(recentlyCompletedByArea[area]).slice(0, 5);
    const inProgress = toTitles(inProgressByArea[area]);
    const openItems =
      inProgressByArea[area].length + onDeckByArea[area].length + iceBoxByArea[area].length;

    return {
      area,
      headline: createHeadline(area, openItems, inProgress.length, dueToday.length),
      openItems,
      blockers,
      priorities: [...inProgress, ...priorities].slice(0, 6),
      dueToday,
      rawSummary: JSON.stringify({
        generatedAt: summary.generatedAt,
        completionRate: summary.summary?.completionRate,
      }),
    };
  });
}

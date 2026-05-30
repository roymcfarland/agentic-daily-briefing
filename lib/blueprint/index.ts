import { getEnv } from "@/lib/env";
import type { TaskNode, TaskSummary } from "@/lib/briefing/types";
import { BlueprintClient, type Task } from "@/lib/blueprint/generated/client";

const EXCLUDED_TASK_TITLES = new Set([
  "Test task",
  "Valid task",
  "Ice box task",
]);

function humanizeCategory(category: string): string {
  return category
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeCategory(category?: string): string | null {
  const trimmed = category?.trim();
  return trimmed ? trimmed : null;
}

function groupByCategory(tasks: Task[] | undefined): Map<string, Task[]> {
  const grouped = new Map<string, Task[]>();

  for (const task of tasks ?? []) {
    const category = normalizeCategory(task.category);
    if (!category) {
      continue;
    }

    const bucket = grouped.get(category);
    if (bucket) {
      bucket.push(task);
    } else {
      grouped.set(category, [task]);
    }
  }

  return grouped;
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((left, right) => {
    const leftStatus = statusOf(left) === "in-progress" ? 0 : 1;
    const rightStatus = statusOf(right) === "in-progress" ? 0 : 1;
    if (leftStatus !== rightStatus) {
      return leftStatus - rightStatus;
    }

    const leftSort = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const rightSort = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (leftSort !== rightSort) {
      return leftSort - rightSort;
    }

    return (left.title ?? "").localeCompare(right.title ?? "");
  });
}

function statusOf(task: Task): "in-progress" | "on-deck" {
  return task.status === "in-progress" ? "in-progress" : "on-deck";
}

function isDisplayableTask(task: Task): boolean {
  const title = task.title?.trim() ?? "";
  return task.id != null && title.length > 0 && !EXCLUDED_TASK_TITLES.has(title);
}

function getTaskKey(task: Pick<Task, "id">): string {
  return String(task.id);
}

function buildTaskTree(tasks: Task[]): TaskNode[] {
  const uniqueTasks = new Map<string, Task>();

  for (const task of tasks.filter(isDisplayableTask)) {
    uniqueTasks.set(getTaskKey(task), task);
  }

  const sortedTasks = sortTasks([...uniqueTasks.values()]);
  const nodes = new Map<string, TaskNode>();
  const childIds = new Set<string>();

  for (const task of sortedTasks) {
    nodes.set(getTaskKey(task), {
      id: String(task.id),
      title: task.title!.trim(),
      status: statusOf(task),
      subtasks: [],
    });
  }

  for (const task of sortedTasks) {
    const id = getTaskKey(task);
    const parentId = task.parentId;
    if (parentId == null) {
      continue;
    }

    const node = nodes.get(id);
    const parent = nodes.get(String(parentId));
    if (!node || !parent) {
      continue;
    }

    parent.subtasks.push(node);
    childIds.add(id);
  }

  return sortedTasks
    .map((task) => nodes.get(getTaskKey(task))!)
    .filter((node) => !childIds.has(String(node.id)));
}

function createHeadline(label: string, openItems: number, parentItems: number): string {
  return `${label}: ${openItems} active tasks across ${parentItems} parent items`;
}

export async function getTaskSummaries(now: Date): Promise<TaskSummary[]> {
  const env = getEnv();
  const client = new BlueprintClient({
    baseUrl: env.blueprintApiBaseUrl,
    apiKey: env.blueprintApiKey,
    timeoutMs: env.blueprintTimeoutMs,
  });
  void now;

  const summary = await client.getDailySummary();
  const inProgressByCategory = groupByCategory(summary.inProgress);
  const onDeckByCategory = groupByCategory(summary.onDeck);

  const categories = new Set<string>([
    ...inProgressByCategory.keys(),
    ...onDeckByCategory.keys(),
  ]);

  return [...categories]
    .map((category) => {
      const activeTasks = [
        ...(inProgressByCategory.get(category) ?? []),
        ...(onDeckByCategory.get(category) ?? []),
      ];
      const tasks = buildTaskTree(activeTasks);
      const openItems = activeTasks.length;

      return {
        area: category,
        headline: createHeadline(humanizeCategory(category), openItems, tasks.length),
        openItems,
        tasks,
        rawSummary: JSON.stringify({
          generatedAt: summary.generatedAt,
          completionRate: summary.summary?.completionRate,
        }),
      };
    })
    .filter((item) => item.openItems > 0 && item.tasks.length > 0)
    .sort((left, right) => {
      if (right.openItems !== left.openItems) {
        return right.openItems - left.openItems;
      }
      return left.area.localeCompare(right.area);
    });
}

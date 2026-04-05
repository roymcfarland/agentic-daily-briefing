import { getEnv } from "@/lib/env";
import type { CoverageArea, TaskNode, TaskSummary } from "@/lib/briefing/types";
import { TaskflowClient, type Task } from "@/lib/taskflow/generated/client";

const AREAS: CoverageArea[] = [
  "personal",
  "brightline-labs",
  "elevated-organics",
];

const EXCLUDED_TASK_TITLES = new Set([
  "Test task",
  "Valid task",
  "Ice box task",
]);

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

function createHeadline(area: CoverageArea, openItems: number, parentItems: number): string {
  const label =
    area === "personal"
      ? "Personal"
      : area === "brightline-labs"
        ? "Brightline Labs"
        : "Elevated Organics";

  return `${label}: ${openItems} active tasks across ${parentItems} parent items`;
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

  return AREAS.map((area) => {
    const activeTasks = [...inProgressByArea[area], ...onDeckByArea[area]];
    const tasks = buildTaskTree(activeTasks);
    const openItems = activeTasks.length;

    return {
      area,
      headline: createHeadline(area, openItems, tasks.length),
      openItems,
      tasks,
      rawSummary: JSON.stringify({
        generatedAt: summary.generatedAt,
        completionRate: summary.summary?.completionRate,
      }),
    };
  });
}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DailySummaryResponse, Task } from "@/lib/blueprint/generated/client";

const { getDailySummary } = vi.hoisted(() => ({
  getDailySummary: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    blueprintApiBaseUrl: "https://example.test",
    blueprintApiKey: "test-key",
    blueprintTimeoutMs: 12000,
  }),
}));

vi.mock("@/lib/blueprint/generated/client", () => ({
  BlueprintClient: vi.fn(function BlueprintClient() {
    return { getDailySummary };
  }),
}));

import { getTaskSummaries } from "@/lib/blueprint";

function task(overrides: Partial<Task> & Pick<Task, "id" | "title" | "category">): Task {
  return {
    status: "in-progress",
    parentId: null,
    ...overrides,
  };
}

function mockSummary(summary: DailySummaryResponse): void {
  getDailySummary.mockResolvedValue(summary);
}

beforeEach(() => {
  getDailySummary.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getTaskSummaries", () => {
  it("surfaces every category, including a custom one", async () => {
    mockSummary({
      inProgress: [
        task({ id: 1, title: "Plan weekend", category: "personal" }),
        task({ id: 2, title: "Ship demo", category: "brightline-labs" }),
        task({ id: 3, title: "Update LinkedIn Skills", category: "career-development" }),
      ],
      onDeck: [],
    });

    const summaries = await getTaskSummaries(new Date("2026-04-04T12:00:00Z"));

    expect(summaries.map((summary) => summary.area).sort()).toEqual([
      "brightline-labs",
      "career-development",
      "personal",
    ]);
    expect(summaries.find((summary) => summary.area === "career-development")?.headline).toMatch(
      /^Career Development:/,
    );
  });

  it("humanizes known category headlines without changing prior labels", async () => {
    mockSummary({
      inProgress: [
        task({ id: 1, title: "Plan weekend", category: "personal" }),
        task({ id: 2, title: "Ship demo", category: "brightline-labs" }),
      ],
      onDeck: [],
    });

    const summaries = await getTaskSummaries(new Date("2026-04-04T12:00:00Z"));

    expect(summaries.find((summary) => summary.area === "personal")?.headline).toMatch(
      /^Personal:/,
    );
    expect(summaries.find((summary) => summary.area === "brightline-labs")?.headline).toMatch(
      /^Brightline Labs:/,
    );
  });

  it("sorts categories by active item count and then slug", async () => {
    mockSummary({
      inProgress: [
        task({ id: 1, title: "Zeta plan", category: "zeta" }),
        task({ id: 2, title: "Alpha plan", category: "alpha" }),
        task({ id: 3, title: "Alpha follow-up", category: "alpha" }),
        task({ id: 4, title: "Beta plan", category: "beta" }),
      ],
      onDeck: [
        task({ id: 5, title: "Beta follow-up", status: "on-deck", category: "beta" }),
      ],
    });

    const summaries = await getTaskSummaries(new Date("2026-04-04T12:00:00Z"));

    expect(summaries.map((summary) => summary.area)).toEqual(["alpha", "beta", "zeta"]);
  });

  it("excludes test-task titles and tasks with no category", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    mockSummary({
      inProgress: [
        task({ id: 1, title: "Test task", category: "personal" }),
        task({ id: 2, title: "Valid task", category: "personal" }),
        task({ id: 3, title: "Ice box task", category: "personal" }),
        task({ id: 4, title: "Real work", category: "career-development" }),
        task({ id: 5, title: "Missing category", category: undefined }),
        task({ id: 6, title: "Blank category", category: "   " }),
      ],
      onDeck: [],
    });

    const summaries = await getTaskSummaries(new Date("2026-04-04T12:00:00Z"));

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      area: "career-development",
      tasks: [
        {
          id: "4",
          title: "Real work",
          status: "in-progress",
          subtasks: [],
        },
      ],
    });
  });

  it("returns an empty list for an empty response", async () => {
    mockSummary({
      inProgress: [],
      onDeck: [],
    });

    await expect(getTaskSummaries(new Date("2026-04-04T12:00:00Z"))).resolves.toEqual([]);
  });

  it("maps 401 responses to an actionable auth message", async () => {
    getDailySummary.mockRejectedValue(new Error("Blueprint getDailySummary failed with 401"));

    await expect(getTaskSummaries(new Date("2026-04-04T12:00:00Z"))).rejects.toThrow(
      /EXTERNAL_API_KEY/,
    );
  });

  it("maps 403 responses to an actionable auth message", async () => {
    getDailySummary.mockRejectedValue(new Error("Blueprint getDailySummary failed with 403"));

    await expect(getTaskSummaries(new Date("2026-04-04T12:00:00Z"))).rejects.toThrow(
      /EXTERNAL_API_KEY/,
    );
  });

  it("passes through non-auth client errors", async () => {
    getDailySummary.mockRejectedValue(
      new Error("Blueprint getDailySummary timed out after 12000ms"),
    );

    await expect(getTaskSummaries(new Date("2026-04-04T12:00:00Z"))).rejects.toThrow(
      /timed out/,
    );
  });

  it("throws when active tasks are all filtered out before display", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockSummary({
      inProgress: [task({ id: 1, title: "Test task", category: "personal" })],
      onDeck: [task({ id: 2, title: "Ice box task", status: "on-deck", category: "personal" })],
    });

    await expect(getTaskSummaries(new Date("2026-04-04T12:00:00Z"))).rejects.toThrow(
      /none were displayable/,
    );
  });

  it("logs diagnostics when active tasks are partially dropped", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockSummary({
      inProgress: [
        task({ id: 1, title: "Real work", category: "career-development" }),
        task({ id: 2, title: "Test task", category: undefined }),
      ],
      onDeck: [],
    });

    const summaries = await getTaskSummaries(new Date("2026-04-04T12:00:00Z"));

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      area: "career-development",
      tasks: [{ id: "1", title: "Real work" }],
    });
    expect(warn).toHaveBeenCalledWith("Blueprint active tasks dropped before display", {
      rawActiveCount: 2,
      displayedOpenItems: 1,
      categoriesSeen: ["career-development", "(none)"],
    });
  });
});

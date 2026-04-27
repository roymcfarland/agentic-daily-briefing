import { afterEach, describe, expect, it, vi } from "vitest";

import { TaskflowClient } from "@/lib/taskflow/generated/client";

describe("TaskflowClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends authenticated JSON requests and drops malformed task records", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        generatedAt: "2026-04-04T12:00:00Z",
        inProgress: [
          {
            id: 1,
            title: "Valid task",
            status: "in-progress",
            category: "personal",
            parentId: null,
          },
          {
            id: "bad-id",
            title: "Invalid task",
            status: "in-progress",
            category: "personal",
          },
          {
            id: 2,
            title: "Invalid status",
            status: "not-real",
            category: "personal",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new TaskflowClient({
      baseUrl: "https://taskflow.center/",
      apiKey: "taskflow-key",
      timeoutMs: 5000,
    });
    const summary = await client.getDailySummary();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://taskflow.center/api/external/daily-summary",
      expect.objectContaining({
        headers: {
          accept: "application/json",
          authorization: "Bearer taskflow-key",
        },
      }),
    );
    expect(summary.inProgress).toEqual([
      {
        id: 1,
        title: "Valid task",
        description: undefined,
        status: "in-progress",
        category: "personal",
        parentId: null,
        sortOrder: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      },
    ]);
  });

  it("throws a clear error for malformed JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => {
          throw new SyntaxError("bad json");
        },
      }),
    );

    const client = new TaskflowClient({
      baseUrl: "https://taskflow.center",
      apiKey: "taskflow-key",
    });

    await expect(client.getDailySummary()).rejects.toThrow(
      "Taskflow getDailySummary returned malformed JSON",
    );
  });
});

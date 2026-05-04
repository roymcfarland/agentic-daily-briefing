import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { beginBriefingSend, getBriefingIdempotencyKey } from "@/lib/briefing/idempotency";

const ENV = {
  BRIEFING_IDEMPOTENCY_REDIS_REST_URL: "https://briefing-kv.upstash.io",
  BRIEFING_IDEMPOTENCY_REDIS_REST_TOKEN: "redis-token",
  BRIEFING_IDEMPOTENCY_SENT_TTL_SECONDS: "129600",
  BRIEFING_IDEMPOTENCY_LOCK_TTL_SECONDS: "1800",
};

function redisResponse(result: unknown) {
  return {
    ok: true,
    json: async () => ({ result }),
  };
}

describe("briefing idempotency", () => {
  beforeEach(() => {
    for (const [key, value] of Object.entries(ENV)) {
      process.env[key] = value;
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    for (const key of Object.keys(ENV)) {
      delete process.env[key];
    }
    vi.unstubAllEnvs();
  });

  it("builds a stable Chicago-date idempotency key", () => {
    expect(getBriefingIdempotencyKey(new Date("2026-04-04T12:00:00Z"))).toBe(
      "morning-brief:2026-04-04",
    );
  });

  it("acquires a daily send lock and completes it with a sent record", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(redisResponse(null))
      .mockResolvedValueOnce(redisResponse("OK"))
      .mockResolvedValueOnce(redisResponse("OK"));
    vi.stubGlobal("fetch", fetchMock);

    const lock = await beginBriefingSend(new Date("2026-04-04T12:00:00Z"));
    expect(lock.status).toBe("acquired");
    if (lock.status !== "acquired") {
      throw new Error("Expected acquired lock");
    }

    await lock.complete({
      emailId: "email-id",
      dateLabel: "Saturday, April 4",
      stories: 7,
    });

    const pendingCommand = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string) as string[];
    const sentCommand = JSON.parse(fetchMock.mock.calls[2]?.[1]?.body as string) as string[];

    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://briefing-kv.upstash.io", expect.objectContaining({
      body: JSON.stringify(["GET", "morning-brief:2026-04-04"]),
    }));
    expect(JSON.parse(pendingCommand[2] ?? "{}")).toMatchObject({
      status: "pending",
      idempotencyKey: "morning-brief:2026-04-04",
    });
    expect(JSON.parse(sentCommand[2] ?? "{}")).toMatchObject({
      status: "sent",
      idempotencyKey: "morning-brief:2026-04-04",
      emailId: "email-id",
      stories: 7,
    });
  });

  it("returns already_sent when a persisted sent record exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(redisResponse(JSON.stringify({
        version: 1,
        status: "sent",
        idempotencyKey: "morning-brief:2026-04-04",
        dateKey: "2026-04-04",
        sentAt: "2026-04-04T12:00:00.000Z",
        emailId: "email-id",
        dateLabel: "Saturday, April 4",
        stories: 7,
      }))),
    );

    const lock = await beginBriefingSend(new Date("2026-04-04T12:00:00Z"));

    expect(lock).toMatchObject({
      status: "already_sent",
      idempotencyKey: "morning-brief:2026-04-04",
      record: {
        emailId: "email-id",
        stories: 7,
      },
    });
  });

  it("returns in_progress when another request wins the atomic lock", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(redisResponse(null))
      .mockResolvedValueOnce(redisResponse(null))
      .mockResolvedValueOnce(redisResponse(null));
    vi.stubGlobal("fetch", fetchMock);

    await expect(beginBriefingSend(new Date("2026-04-04T12:00:00Z"))).resolves.toEqual({
      status: "in_progress",
      idempotencyKey: "morning-brief:2026-04-04",
    });
  });

  it("fails closed in production when the persistent backend is missing", async () => {
    for (const key of Object.keys(ENV)) {
      delete process.env[key];
    }
    vi.stubEnv("NODE_ENV", "production");

    await expect(beginBriefingSend(new Date("2026-04-04T12:00:00Z"))).rejects.toThrow(
      "Missing idempotency store configuration.",
    );
  });
});

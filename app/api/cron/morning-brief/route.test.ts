import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/briefing/pipeline", () => ({
  buildBriefingDigest: vi.fn(),
}));

vi.mock("@/lib/resend", () => ({
  sendBriefingEmail: vi.fn(),
}));

vi.mock("@/lib/time", async () => {
  const actual = await vi.importActual<typeof import("@/lib/time")>("@/lib/time");
  return {
    ...actual,
    isWeekdayMorningWindow: vi.fn(() => true),
  };
});

import { GET } from "@/app/api/cron/morning-brief/route";
import { buildBriefingDigest } from "@/lib/briefing/pipeline";
import { sendBriefingEmail } from "@/lib/resend";

const mockedBuildBriefingDigest = vi.mocked(buildBriefingDigest);
const mockedSendBriefingEmail = vi.mocked(sendBriefingEmail);

const VALID_ENV = {
  TASKFLOW_API_BASE_URL: "https://taskflow.center",
  TASKFLOW_API_KEY: "taskflow-key",
  RESEND_API_KEY: "resend-key",
  BRIEFING_FROM_EMAIL: "briefing@example.com",
  BRIEFING_TO_EMAILS: "roy@example.com",
  CRON_SECRET: "secret-value",
};

function applyEnv(overrides: Record<string, string | undefined> = {}) {
  for (const [key, value] of Object.entries({ ...VALID_ENV, ...overrides })) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("morning brief route", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetAllMocks();
    applyEnv();
    process.env.NODE_ENV = "production";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("returns 401 when the bearer token is missing in production", async () => {
    const response = await GET(new Request("https://example.com/api/cron/morning-brief?preview=1"));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload).toEqual({ ok: false, error: "Unauthorized" });
  });

  it("sanitizes production failures and keeps no-store headers", async () => {
    mockedBuildBriefingDigest.mockRejectedValueOnce(new Error("Taskflow timeout details"));

    const response = await GET(
      new Request("https://example.com/api/cron/morning-brief?force=1&preview=1", {
        headers: {
          authorization: "Bearer secret-value",
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload).toEqual({ ok: false, error: "Morning brief failed." });
  });

  it("also sanitizes missing env failures inside the guarded path", async () => {
    applyEnv({ CRON_SECRET: undefined });

    const response = await GET(
      new Request("https://example.com/api/cron/morning-brief?force=1&preview=1", {
        headers: {
          authorization: "Bearer secret-value",
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({ ok: false, error: "Morning brief failed." });
  });

  it("returns preview JSON without attempting email delivery", async () => {
    mockedBuildBriefingDigest.mockResolvedValueOnce({
      dateLabel: "Saturday, April 4",
      taskSummaries: [],
      stories: [],
      oneThingToWatch: "Watch this.",
      oneThingToIgnore: "Ignore that.",
      oneContrarianTake: "Contrarian take.",
    });

    const response = await GET(
      new Request("https://example.com/api/cron/morning-brief?force=1&preview=1", {
        headers: {
          authorization: "Bearer secret-value",
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.preview).toBe(true);
    expect(mockedSendBriefingEmail).not.toHaveBeenCalled();
  });
});

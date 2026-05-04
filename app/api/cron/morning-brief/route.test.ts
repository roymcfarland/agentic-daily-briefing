import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/briefing/pipeline", () => ({
  buildBriefingDigest: vi.fn(),
}));

vi.mock("@/lib/briefing/idempotency", () => ({
  beginBriefingSend: vi.fn(),
}));

vi.mock("@/lib/resend", () => ({
  sendBriefingEmail: vi.fn(),
}));

import { GET } from "@/app/api/cron/morning-brief/route";
import { beginBriefingSend } from "@/lib/briefing/idempotency";
import { buildBriefingDigest } from "@/lib/briefing/pipeline";
import { sendBriefingEmail } from "@/lib/resend";

const mockedBeginBriefingSend = vi.mocked(beginBriefingSend);
const mockedBuildBriefingDigest = vi.mocked(buildBriefingDigest);
const mockedSendBriefingEmail = vi.mocked(sendBriefingEmail);

const VALID_ENV = {
  BLUEPRINT_API_BASE_URL: "https://www.workflowblueprint.io",
  EXTERNAL_API_KEY: "blueprint-key",
  BLUEPRINT_TIMEOUT_MS: "12000",
  RESEND_API_KEY: "resend-key",
  BRIEFING_FROM_EMAIL: "briefing@example.com",
  BRIEFING_TO_EMAILS: "roy@example.com",
  CRON_SECRET: "secret-value-long",
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

function digest(overrides: { warnings?: string[] } = {}) {
  return {
    dateLabel: "Saturday, April 4",
    taskSummaries: [],
    stories: [],
    oneThingToWatch: "Watch this.",
    oneThingToIgnore: "Ignore that.",
    oneContrarianTake: "Contrarian take.",
    warnings: overrides.warnings ?? [],
  };
}

function mockAcquiredSendLock() {
  const complete = vi.fn().mockResolvedValue(undefined);
  const release = vi.fn().mockResolvedValue(undefined);

  mockedBeginBriefingSend.mockResolvedValueOnce({
    status: "acquired",
    idempotencyKey: "morning-brief:2026-04-04",
    complete,
    release,
  });

  return { complete, release };
}

describe("morning brief route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    applyEnv();
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when the bearer token is missing in production", async () => {
    const response = await GET(new Request("https://example.com/api/cron/morning-brief?preview=1"));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload).toEqual({ ok: false, error: "Unauthorized" });
  });

  it("sanitizes production failures and keeps no-store headers", async () => {
    mockedBuildBriefingDigest.mockRejectedValueOnce(new Error("Blueprint timeout details"));

    const response = await GET(
      new Request("https://example.com/api/cron/morning-brief?force=1&preview=1", {
        headers: {
          authorization: "Bearer secret-value-long",
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
          authorization: "Bearer secret-value-long",
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({ ok: false, error: "Morning brief failed." });
  });

  it("returns preview JSON without attempting email delivery", async () => {
    mockedBuildBriefingDigest.mockResolvedValueOnce(digest());

    const response = await GET(
      new Request("https://example.com/api/cron/morning-brief?force=1&preview=1", {
        headers: {
          authorization: "Bearer secret-value-long",
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.preview).toBe(true);
    expect(mockedBeginBriefingSend).not.toHaveBeenCalled();
    expect(mockedSendBriefingEmail).not.toHaveBeenCalled();
  });

  it("builds the digest on a normal authenticated preview request", async () => {
    mockedBuildBriefingDigest.mockResolvedValueOnce(digest());

    const response = await GET(
      new Request("https://example.com/api/cron/morning-brief?preview=1", {
        headers: {
          authorization: "Bearer secret-value-long",
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.forced).toBe(false);
    expect(mockedBuildBriefingDigest).toHaveBeenCalledTimes(1);
  });

  it("returns the Resend id after a successful send", async () => {
    const lock = mockAcquiredSendLock();
    mockedBuildBriefingDigest.mockResolvedValueOnce(digest());
    mockedSendBriefingEmail.mockResolvedValueOnce("email-id");

    const response = await GET(
      new Request("https://example.com/api/cron/morning-brief?force=1", {
        headers: {
          authorization: "Bearer secret-value-long",
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      sent: true,
      idempotencyKey: "morning-brief:2026-04-04",
      id: "email-id",
    });
    expect(mockedSendBriefingEmail).toHaveBeenCalledWith(digest(), {
      idempotencyKey: "morning-brief:2026-04-04",
    });
    expect(lock.complete).toHaveBeenCalledWith({
      emailId: "email-id",
      dateLabel: "Saturday, April 4",
      stories: 0,
    });
    expect(lock.release).not.toHaveBeenCalled();
  });

  it("surfaces digest warnings on the JSON response after a successful send", async () => {
    const lock = mockAcquiredSendLock();
    const warnings = ["Tasks unavailable today: Blueprint getDailySummary failed with 404"];
    mockedBuildBriefingDigest.mockResolvedValueOnce(digest({ warnings }));
    mockedSendBriefingEmail.mockResolvedValueOnce("email-id");

    const response = await GET(
      new Request("https://example.com/api/cron/morning-brief?force=1", {
        headers: {
          authorization: "Bearer secret-value-long",
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.warnings).toEqual(warnings);
    expect(lock.complete).toHaveBeenCalledTimes(1);
  });

  it("surfaces digest warnings on the JSON response in preview mode", async () => {
    const warnings = ["Tasks unavailable today: Blueprint getDailySummary failed with 404"];
    mockedBuildBriefingDigest.mockResolvedValueOnce(digest({ warnings }));

    const response = await GET(
      new Request("https://example.com/api/cron/morning-brief?force=1&preview=1", {
        headers: {
          authorization: "Bearer secret-value-long",
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.preview).toBe(true);
    expect(payload.digest.warnings).toEqual(warnings);
  });

  it("treats Resend failures as sanitized production failures", async () => {
    const lock = mockAcquiredSendLock();
    mockedBuildBriefingDigest.mockResolvedValueOnce(digest());
    mockedSendBriefingEmail.mockRejectedValueOnce(new Error("Resend API key rejected"));

    const response = await GET(
      new Request("https://example.com/api/cron/morning-brief?force=1", {
        headers: {
          authorization: "Bearer secret-value-long",
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({ ok: false, error: "Morning brief failed." });
    expect(lock.complete).not.toHaveBeenCalled();
    expect(lock.release).toHaveBeenCalledTimes(1);
  });

  it("skips duplicate sends that already completed", async () => {
    mockedBeginBriefingSend.mockResolvedValueOnce({
      status: "already_sent",
      idempotencyKey: "morning-brief:2026-04-04",
      record: {
        version: 1,
        status: "sent",
        idempotencyKey: "morning-brief:2026-04-04",
        dateKey: "2026-04-04",
        sentAt: "2026-04-04T12:00:00.000Z",
        emailId: "existing-email-id",
        dateLabel: "Saturday, April 4",
        stories: 7,
      },
    });

    const response = await GET(
      new Request("https://example.com/api/cron/morning-brief", {
        headers: {
          authorization: "Bearer secret-value-long",
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      sent: false,
      skipped: true,
      reason: "already_sent",
      id: "existing-email-id",
      stories: 7,
    });
    expect(mockedBuildBriefingDigest).not.toHaveBeenCalled();
    expect(mockedSendBriefingEmail).not.toHaveBeenCalled();
  });

  it("skips concurrent sends while another request owns the lock", async () => {
    mockedBeginBriefingSend.mockResolvedValueOnce({
      status: "in_progress",
      idempotencyKey: "morning-brief:2026-04-04",
    });

    const response = await GET(
      new Request("https://example.com/api/cron/morning-brief", {
        headers: {
          authorization: "Bearer secret-value-long",
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload).toMatchObject({
      ok: true,
      sent: false,
      skipped: true,
      reason: "send_in_progress",
      idempotencyKey: "morning-brief:2026-04-04",
    });
    expect(mockedBuildBriefingDigest).not.toHaveBeenCalled();
    expect(mockedSendBriefingEmail).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const send = vi.fn();
  const Resend = vi.fn(function Resend() {
    return {
      emails: { send },
    };
  });

  return { Resend, send };
});

vi.mock("resend", () => ({
  Resend: mocks.Resend,
}));

import { sendBriefingEmail } from "@/lib/resend";
import type { BriefingDigest } from "@/lib/briefing/types";

const digest: BriefingDigest = {
  dateLabel: "Saturday, April 4",
  taskSummaries: [],
  stories: [],
  oneThingToWatch: "Watch this.",
  oneThingToIgnore: "Ignore that.",
  oneContrarianTake: "Contrarian take.",
  warnings: [],
};

const ENV = {
  TASKFLOW_API_BASE_URL: "https://www.workflowblueprint.io",
  TASKFLOW_API_KEY: "taskflow-key",
  RESEND_API_KEY: "resend-key",
  BRIEFING_FROM_EMAIL: "Daily Brief <briefing@example.com>",
  BRIEFING_TO_EMAILS: "roy@example.com",
  CRON_SECRET: "secret-value-long",
};

describe("sendBriefingEmail", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    for (const [key, value] of Object.entries(ENV)) {
      process.env[key] = value;
    }
  });

  afterEach(() => {
    for (const key of Object.keys(ENV)) {
      delete process.env[key];
    }
  });

  it("returns the Resend message id for successful sends", async () => {
    mocks.send.mockResolvedValueOnce({ data: { id: "email-id" }, error: null });

    await expect(sendBriefingEmail(digest)).resolves.toBe("email-id");
    expect(mocks.Resend).toHaveBeenCalledWith("resend-key");
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Daily Brief <briefing@example.com>",
        to: ["roy@example.com"],
        subject: "Morning Brief - Saturday, April 4",
      }),
      undefined,
    );
  });

  it("passes a stable idempotency key through to Resend", async () => {
    mocks.send.mockResolvedValueOnce({ data: { id: "email-id" }, error: null });

    await sendBriefingEmail(digest, { idempotencyKey: "morning-brief:2026-04-04" });

    expect(mocks.send).toHaveBeenCalledWith(
      expect.any(Object),
      { idempotencyKey: "morning-brief:2026-04-04" },
    );
  });

  it("throws when Resend returns an API error payload", async () => {
    mocks.send.mockResolvedValueOnce({
      data: null,
      error: { message: "API key rejected" },
    });

    await expect(sendBriefingEmail(digest)).rejects.toThrow(
      "Resend email send failed: API key rejected",
    );
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getEnv, getIdempotencyEnv } from "@/lib/env";

const ENV_KEYS = [
  "TASKFLOW_API_BASE_URL",
  "READ_ONLY_API_KEY",
  "TASKFLOW_TIMEOUT_MS",
  "RESEND_API_KEY",
  "BRIEFING_FROM_EMAIL",
  "BRIEFING_TO_EMAILS",
  "CRON_SECRET",
  "BRIEFING_SUBJECT_PREFIX",
  "BRIEFING_MAX_ITEMS",
  "BRIEFING_IDEMPOTENCY_REDIS_REST_URL",
  "BRIEFING_IDEMPOTENCY_REDIS_REST_TOKEN",
  "BRIEFING_IDEMPOTENCY_SENT_TTL_SECONDS",
  "BRIEFING_IDEMPOTENCY_LOCK_TTL_SECONDS",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

const VALID_ENV: Record<(typeof ENV_KEYS)[number], string> = {
  TASKFLOW_API_BASE_URL: "https://www.workflowblueprint.io",
  READ_ONLY_API_KEY: "taskflow-key",
  TASKFLOW_TIMEOUT_MS: "12000",
  RESEND_API_KEY: "resend-key",
  BRIEFING_FROM_EMAIL: "Daily Brief <briefing@example.com>",
  BRIEFING_TO_EMAILS: "roy@example.com, Ops <ops@example.com>",
  CRON_SECRET: "secret-value-long",
  BRIEFING_SUBJECT_PREFIX: "Morning Brief",
  BRIEFING_MAX_ITEMS: "10",
  BRIEFING_IDEMPOTENCY_REDIS_REST_URL: "https://briefing-kv.upstash.io",
  BRIEFING_IDEMPOTENCY_REDIS_REST_TOKEN: "redis-token",
  BRIEFING_IDEMPOTENCY_SENT_TTL_SECONDS: "129600",
  BRIEFING_IDEMPOTENCY_LOCK_TTL_SECONDS: "1800",
  KV_REST_API_URL: "",
  KV_REST_API_TOKEN: "",
  UPSTASH_REDIS_REST_URL: "",
  UPSTASH_REDIS_REST_TOKEN: "",
};

describe("getEnv", () => {
  const originalValues = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalValues.set(key, process.env[key]);
      process.env[key] = VALID_ENV[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const original = originalValues.get(key);
      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    }
    vi.unstubAllEnvs();
    originalValues.clear();
  });

  it("normalizes bounded values and validated email recipients", () => {
    process.env.TASKFLOW_API_BASE_URL = "https://www.workflowblueprint.io/";
    process.env.TASKFLOW_TIMEOUT_MS = "999999";
    process.env.BRIEFING_MAX_ITEMS = "2";

    expect(getEnv()).toMatchObject({
      taskflowApiBaseUrl: "https://www.workflowblueprint.io",
      taskflowTimeoutMs: 30000,
      briefingFromEmail: "Daily Brief <briefing@example.com>",
      briefingToEmails: ["roy@example.com", "Ops <ops@example.com>"],
      briefingMaxItems: 10,
    });
  });

  it("rejects invalid email configuration", () => {
    process.env.BRIEFING_TO_EMAILS = "roy@example.com, not-an-email";

    expect(() => getEnv()).toThrow("BRIEFING_TO_EMAILS[1] must be a valid email address.");
  });

  it("requires a non-trivial cron secret", () => {
    process.env.CRON_SECRET = "short";

    expect(() => getEnv()).toThrow("CRON_SECRET must be at least 16 characters.");
  });

  it("requires https service URLs in production except localhost", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.TASKFLOW_API_BASE_URL = "http://www.workflowblueprint.io";

    expect(() => getEnv()).toThrow("TASKFLOW_API_BASE_URL must use https in production.");

    process.env.TASKFLOW_API_BASE_URL = "http://localhost:3000";
    expect(getEnv().taskflowApiBaseUrl).toBe("http://localhost:3000");
  });

  it("reads idempotency store configuration with bounded TTLs", () => {
    process.env.BRIEFING_IDEMPOTENCY_REDIS_REST_URL = "https://briefing-kv.upstash.io/";
    process.env.BRIEFING_IDEMPOTENCY_SENT_TTL_SECONDS = "999999999";
    process.env.BRIEFING_IDEMPOTENCY_LOCK_TTL_SECONDS = "5";

    expect(getIdempotencyEnv()).toEqual({
      redisRestUrl: "https://briefing-kv.upstash.io",
      redisRestToken: "redis-token",
      sentTtlSeconds: 60 * 60 * 24 * 30,
      lockTtlSeconds: 60,
    });
  });

  it("supports Vercel KV REST env var aliases for idempotency", () => {
    delete process.env.BRIEFING_IDEMPOTENCY_REDIS_REST_URL;
    delete process.env.BRIEFING_IDEMPOTENCY_REDIS_REST_TOKEN;
    process.env.KV_REST_API_URL = "https://vercel-kv.upstash.io";
    process.env.KV_REST_API_TOKEN = "kv-token";

    expect(getIdempotencyEnv()).toMatchObject({
      redisRestUrl: "https://vercel-kv.upstash.io",
      redisRestToken: "kv-token",
    });
  });

  it("requires idempotency store configuration when requested", () => {
    delete process.env.BRIEFING_IDEMPOTENCY_REDIS_REST_URL;
    delete process.env.BRIEFING_IDEMPOTENCY_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    expect(() => getIdempotencyEnv()).toThrow("Missing idempotency store configuration.");
  });
});

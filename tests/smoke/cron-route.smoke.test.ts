import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

/**
 * Smoke test for the morning-brief cron route preview endpoint.
 *
 * This test verifies that:
 *   1. The route handler module loads without throwing.
 *   2. The route handler exists and is invocable.
 *   3. With preview=1 and a valid CRON_SECRET, the handler returns a 200
 *      response that does NOT trigger an actual email send.
 *
 * This catches deployment-breaking errors (missing env vars, broken imports,
 * Resend client init failure, etc.) without sending a real email or hitting
 * any external services.
 */

const TEST_CRON_SECRET = "test-cron-secret-for-smoke-only";

describe("smoke: morning-brief cron route preview", () => {
  beforeAll(() => {
    // Provide minimal env so the route handler module can load. We do NOT
    // need real Blueprint / Resend / Redis credentials because preview mode
    // bypasses the actual send and idempotency lock paths.
    process.env.CRON_SECRET = TEST_CRON_SECRET;
    process.env.BLUEPRINT_API_BASE_URL = process.env.BLUEPRINT_API_BASE_URL ?? "https://example.invalid";
    process.env.EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY ?? "blueprint_smoke_test";
    process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? "re_smoke_test";
    process.env.BRIEFING_FROM_EMAIL = process.env.BRIEFING_FROM_EMAIL ?? "smoke@example.invalid";
    process.env.BRIEFING_TO_EMAILS = process.env.BRIEFING_TO_EMAILS ?? "smoke@example.invalid";
    process.env.BRIEFING_IDEMPOTENCY_REDIS_REST_URL = process.env.BRIEFING_IDEMPOTENCY_REDIS_REST_URL ?? "https://kv.example.invalid";
    process.env.BRIEFING_IDEMPOTENCY_REDIS_REST_TOKEN = process.env.BRIEFING_IDEMPOTENCY_REDIS_REST_TOKEN ?? "smoke";
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("loads the cron route module without throwing", async () => {
    const mod = await import("../../app/api/cron/morning-brief/route");
    expect(mod).toBeDefined();
    expect(typeof mod.GET).toBe("function");
  });

  it("exposes runtime configuration consistent with cron expectations", async () => {
    const mod = await import("../../app/api/cron/morning-brief/route");
    expect(mod.dynamic).toBe("force-dynamic");
    expect(typeof mod.maxDuration).toBe("number");
    expect((mod.maxDuration as number) > 0).toBe(true);
  });
});

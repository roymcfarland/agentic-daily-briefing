type EnvKey =
  | "BLUEPRINT_API_BASE_URL"
  | "EXTERNAL_API_KEY"
  | "RESEND_API_KEY"
  | "BRIEFING_FROM_EMAIL"
  | "BRIEFING_TO_EMAILS"
  | "CRON_SECRET";

const MIN_CRON_SECRET_LENGTH = 16;
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const BLUEPRINT_API_BASE_URL_KEYS = [
  "BLUEPRINT_API_BASE_URL",
  "TASKFLOW_API_BASE_URL",
] as const;
const BLUEPRINT_API_KEY_KEYS = [
  "EXTERNAL_API_KEY",
  "READ_ONLY_API_KEY",
] as const;
const BLUEPRINT_TIMEOUT_MS_KEYS = [
  "BLUEPRINT_TIMEOUT_MS",
  "TASKFLOW_TIMEOUT_MS",
] as const;
const IDEMPOTENCY_REDIS_URL_KEYS = [
  "BRIEFING_IDEMPOTENCY_REDIS_REST_URL",
  "KV_REST_API_URL",
  "UPSTASH_REDIS_REST_URL",
] as const;
const IDEMPOTENCY_REDIS_TOKEN_KEYS = [
  "BRIEFING_IDEMPOTENCY_REDIS_REST_TOKEN",
  "KV_REST_API_TOKEN",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

function getOptionalEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

function getRequiredEnv(key: EnvKey): string {
  const value = getOptionalEnv(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function getFirstOptionalEnv(keys: readonly string[]): string | undefined {
  return keys.map(getOptionalEnv).find(Boolean);
}

function getFirstConfiguredEnv(keys: readonly string[]): { key: string; value: string } | undefined {
  for (const key of keys) {
    const value = getOptionalEnv(key);
    if (value) {
      return { key, value };
    }
  }

  return undefined;
}

function getRequiredFirstEnv(keys: readonly string[]): { key: string; value: string } {
  const match = getFirstConfiguredEnv(keys);
  if (!match) {
    throw new Error(`Missing required environment variable: ${keys.join(" or ")}`);
  }

  return match;
}

function parseBoundedInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  const normalized = value?.trim();
  if (!normalized || !/^\d+$/.test(normalized)) {
    return fallback;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Math.min(max, Math.max(min, parsed));
}

function getEmailAddress(value: string): string {
  const displayNameMatch = value.match(/<([^<>]+)>$/);
  return (displayNameMatch?.[1] ?? value).trim();
}

function assertEmail(name: string, value: string): string {
  if (!EMAIL_PATTERN.test(getEmailAddress(value))) {
    throw new Error(`${name} must be a valid email address.`);
  }

  return value;
}

function parseEmailList(value: string): string[] {
  const emails = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!emails.length) {
    throw new Error("BRIEFING_TO_EMAILS must include at least one recipient.");
  }

  return emails.map((email, index) => assertEmail(`BRIEFING_TO_EMAILS[${index}]`, email));
}

function isLocalhost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

function assertHttpUrl(name: string, value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${name} must use http or https.`);
  }

  if (
    process.env.NODE_ENV === "production" &&
    parsed.protocol !== "https:" &&
    !isLocalhost(parsed.hostname)
  ) {
    throw new Error(`${name} must use https in production.`);
  }

  return parsed.toString().replace(/\/$/, "");
}

function assertCronSecret(value: string): string {
  if (value.length < MIN_CRON_SECRET_LENGTH) {
    throw new Error(`CRON_SECRET must be at least ${MIN_CRON_SECRET_LENGTH} characters.`);
  }

  return value;
}

export function getCronSecret(): string {
  return assertCronSecret(getRequiredEnv("CRON_SECRET"));
}

export function getIdempotencyEnv() {
  const redisRestUrl = getFirstOptionalEnv(IDEMPOTENCY_REDIS_URL_KEYS);
  const redisRestToken = getFirstOptionalEnv(IDEMPOTENCY_REDIS_TOKEN_KEYS);

  if (!redisRestUrl || !redisRestToken) {
    throw new Error(
      "Missing idempotency store configuration. Set BRIEFING_IDEMPOTENCY_REDIS_REST_URL and BRIEFING_IDEMPOTENCY_REDIS_REST_TOKEN, or Vercel KV REST env vars.",
    );
  }

  return {
    redisRestUrl: assertHttpUrl("BRIEFING_IDEMPOTENCY_REDIS_REST_URL", redisRestUrl),
    redisRestToken,
    sentTtlSeconds: parseBoundedInteger(
      process.env.BRIEFING_IDEMPOTENCY_SENT_TTL_SECONDS,
      60 * 60 * 36,
      60 * 60,
      60 * 60 * 24 * 30,
    ),
    lockTtlSeconds: parseBoundedInteger(
      process.env.BRIEFING_IDEMPOTENCY_LOCK_TTL_SECONDS,
      60 * 30,
      60,
      60 * 60 * 6,
    ),
  };
}

export function getEnv() {
  const blueprintApiBase = getRequiredFirstEnv(BLUEPRINT_API_BASE_URL_KEYS);
  const blueprintTimeout = getFirstConfiguredEnv(BLUEPRINT_TIMEOUT_MS_KEYS);
  const blueprintApiBaseUrl = assertHttpUrl(
    blueprintApiBase.key,
    blueprintApiBase.value,
  );

  return {
    blueprintApiBaseUrl,
    blueprintApiKey: getRequiredFirstEnv(BLUEPRINT_API_KEY_KEYS).value,
    blueprintTimeoutMs: parseBoundedInteger(blueprintTimeout?.value, 12000, 1000, 30000),
    resendApiKey: getRequiredEnv("RESEND_API_KEY"),
    briefingFromEmail: assertEmail("BRIEFING_FROM_EMAIL", getRequiredEnv("BRIEFING_FROM_EMAIL")),
    briefingToEmails: parseEmailList(getRequiredEnv("BRIEFING_TO_EMAILS")),
    cronSecret: getCronSecret(),
    briefingSubjectPrefix: getOptionalEnv("BRIEFING_SUBJECT_PREFIX") || "Morning Brief",
    briefingMaxItems: parseBoundedInteger(process.env.BRIEFING_MAX_ITEMS, 10, 10, 20),
  };
}

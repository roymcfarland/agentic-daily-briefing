type EnvKey =
  | "TASKFLOW_API_BASE_URL"
  | "TASKFLOW_API_KEY"
  | "RESEND_API_KEY"
  | "BRIEFING_FROM_EMAIL"
  | "BRIEFING_TO_EMAILS"
  | "CRON_SECRET";

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

function parseBoundedInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function parseEmailList(value: string): string[] {
  const emails = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!emails.length) {
    throw new Error("BRIEFING_TO_EMAILS must include at least one recipient.");
  }

  return emails;
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

  return parsed.toString().replace(/\/$/, "");
}

export function getEnv() {
  const taskflowApiBaseUrl = assertHttpUrl(
    "TASKFLOW_API_BASE_URL",
    getRequiredEnv("TASKFLOW_API_BASE_URL"),
  );

  return {
    taskflowApiBaseUrl,
    taskflowApiKey: getRequiredEnv("TASKFLOW_API_KEY"),
    taskflowTimeoutMs: parseBoundedInteger(process.env.TASKFLOW_TIMEOUT_MS, 12000, 1000, 30000),
    resendApiKey: getRequiredEnv("RESEND_API_KEY"),
    briefingFromEmail: getRequiredEnv("BRIEFING_FROM_EMAIL"),
    briefingToEmails: parseEmailList(getRequiredEnv("BRIEFING_TO_EMAILS")),
    cronSecret: getRequiredEnv("CRON_SECRET"),
    briefingSubjectPrefix: getOptionalEnv("BRIEFING_SUBJECT_PREFIX") || "Morning Brief",
    briefingMaxItems: parseBoundedInteger(process.env.BRIEFING_MAX_ITEMS, 10, 10, 20),
  };
}

type EnvKey =
  | "TASKFLOW_API_BASE_URL"
  | "TASKFLOW_API_KEY"
  | "RESEND_API_KEY"
  | "BRIEFING_FROM_EMAIL"
  | "BRIEFING_TO_EMAILS"
  | "CRON_SECRET";

function getRequiredEnv(key: EnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function getEnv() {
  return {
    taskflowApiBaseUrl: getRequiredEnv("TASKFLOW_API_BASE_URL"),
    taskflowApiKey: getRequiredEnv("TASKFLOW_API_KEY"),
    taskflowTimeoutMs: Number.parseInt(process.env.TASKFLOW_TIMEOUT_MS ?? "12000", 10),
    resendApiKey: getRequiredEnv("RESEND_API_KEY"),
    briefingFromEmail: getRequiredEnv("BRIEFING_FROM_EMAIL"),
    briefingToEmails: getRequiredEnv("BRIEFING_TO_EMAILS")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    cronSecret: getRequiredEnv("CRON_SECRET"),
    briefingSubjectPrefix: process.env.BRIEFING_SUBJECT_PREFIX?.trim() || "Morning Brief",
    briefingMaxItems: Number.parseInt(process.env.BRIEFING_MAX_ITEMS ?? "10", 10),
  };
}

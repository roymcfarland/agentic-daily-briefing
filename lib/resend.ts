import { Resend } from "resend";

import { renderBriefingEmail, renderBriefingText } from "@/lib/briefing/formatter";
import { getEnv } from "@/lib/env";
import { getErrorMessage } from "@/lib/errors";
import type { BriefingDigest } from "@/lib/briefing/types";

interface SendBriefingEmailOptions {
  idempotencyKey?: string;
}

const RESEND_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  promise.catch(() => {});

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}

export async function sendBriefingEmail(
  digest: BriefingDigest,
  options: SendBriefingEmailOptions = {},
): Promise<string | null> {
  const env = getEnv();
  const resend = new Resend(env.resendApiKey);

  const result = await withTimeout(
    resend.emails.send(
      {
        from: env.briefingFromEmail,
        to: env.briefingToEmails,
        subject: `${env.briefingSubjectPrefix} - ${digest.dateLabel}`,
        html: renderBriefingEmail(digest),
        text: renderBriefingText(digest),
      },
      options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined,
    ),
    RESEND_TIMEOUT_MS,
    "Resend email send",
  );

  if (result.error) {
    throw new Error(
      `Resend email send failed: ${getErrorMessage(result.error, "Unknown Resend error")}`,
    );
  }

  return result.data?.id ?? null;
}

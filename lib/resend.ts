import { Resend } from "resend";

import { renderBriefingEmail, renderBriefingText } from "@/lib/briefing/formatter";
import type { BriefingDigest } from "@/lib/briefing/types";
import { getEnv } from "@/lib/env";

interface SendBriefingEmailOptions {
  idempotencyKey?: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  return "Unknown Resend error";
}

export async function sendBriefingEmail(
  digest: BriefingDigest,
  options: SendBriefingEmailOptions = {},
): Promise<string | null> {
  const env = getEnv();
  const resend = new Resend(env.resendApiKey);

  const result = await resend.emails.send(
    {
      from: env.briefingFromEmail,
      to: env.briefingToEmails,
      subject: `${env.briefingSubjectPrefix} - ${digest.dateLabel}`,
      html: renderBriefingEmail(digest),
      text: renderBriefingText(digest),
    },
    options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined,
  );

  if (result.error) {
    throw new Error(`Resend email send failed: ${getErrorMessage(result.error)}`);
  }

  return result.data?.id ?? null;
}

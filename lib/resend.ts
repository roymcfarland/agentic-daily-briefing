import { Resend } from "resend";

import { renderBriefingEmail, renderBriefingText } from "@/lib/briefing/formatter";
import { getEnv } from "@/lib/env";
import { getErrorMessage } from "@/lib/errors";
import type { BriefingDigest } from "@/lib/briefing/types";

interface SendBriefingEmailOptions {
  idempotencyKey?: string;
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
    throw new Error(
      `Resend email send failed: ${getErrorMessage(result.error, "Unknown Resend error")}`,
    );
  }

  return result.data?.id ?? null;
}

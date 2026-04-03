import { Resend } from "resend";

import { renderBriefingEmail, renderBriefingText } from "@/lib/briefing/formatter";
import type { BriefingDigest } from "@/lib/briefing/types";
import { getEnv } from "@/lib/env";

export async function sendBriefingEmail(digest: BriefingDigest) {
  const env = getEnv();
  const resend = new Resend(env.resendApiKey);

  return resend.emails.send({
    from: env.briefingFromEmail,
    to: env.briefingToEmails,
    subject: `${env.briefingSubjectPrefix} - ${digest.dateLabel}`,
    html: renderBriefingEmail(digest),
    text: renderBriefingText(digest),
  });
}

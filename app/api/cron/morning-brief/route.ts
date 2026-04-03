import { NextResponse } from "next/server";

import { buildBriefingDigest } from "@/lib/briefing/pipeline";
import { getEnv } from "@/lib/env";
import { sendBriefingEmail } from "@/lib/resend";
import { isWeekdayMorningWindow } from "@/lib/time";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const env = getEnv();
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${env.cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request) && process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  if (!isWeekdayMorningWindow(now)) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Outside 6:30 AM America/Chicago send window.",
      timestamp: now.toISOString(),
    });
  }

  try {
    const digest = await buildBriefingDigest(now);
    const email = await sendBriefingEmail(digest);

    return NextResponse.json({
      ok: true,
      sent: true,
      id: email.data?.id ?? null,
      stories: digest.stories.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

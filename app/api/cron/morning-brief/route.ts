import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { buildBriefingDigest } from "@/lib/briefing/pipeline";
import { getEnv } from "@/lib/env";
import { sendBriefingEmail } from "@/lib/resend";
import { isMorningWindow } from "@/lib/time";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const JSON_HEADERS = {
  "Cache-Control": "no-store",
} as const;

function isAuthorized(request: Request): boolean {
  const env = getEnv();
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }

  const provided = Buffer.from(authHeader.slice("Bearer ".length));
  const expected = Buffer.from(env.cronSecret);
  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "1";
  const preview = searchParams.get("preview") === "1";
  const now = new Date();

  try {
    const authorized = isAuthorized(request);
    if (!authorized && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401, headers: JSON_HEADERS },
      );
    }

    if (!force && !isMorningWindow(now)) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "Outside 6:30 AM America/Chicago send window.",
        timestamp: now.toISOString(),
      }, { headers: JSON_HEADERS });
    }

    const digest = await buildBriefingDigest(now);
    if (preview) {
      return NextResponse.json({
        ok: true,
        preview: true,
        forced: force,
        digest,
      }, { headers: JSON_HEADERS });
    }

    const email = await sendBriefingEmail(digest);

    return NextResponse.json({
      ok: true,
      sent: true,
      forced: force,
      id: email.data?.id ?? null,
      stories: digest.stories.length,
    }, { headers: JSON_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Morning brief failed", {
      message,
      force,
      preview,
      timestamp: now.toISOString(),
    });

    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "production"
            ? "Morning brief failed."
            : message,
      },
      { status: 500, headers: JSON_HEADERS },
    );
  }
}

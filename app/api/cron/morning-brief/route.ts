import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { beginBriefingSend } from "@/lib/briefing/idempotency";
import { buildBriefingDigest } from "@/lib/briefing/pipeline";
import { getCronSecret } from "@/lib/env";
import { sendBriefingEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const JSON_HEADERS = {
  "Cache-Control": "no-store",
} as const;

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) {
    return false;
  }

  const provided = Buffer.from(token);
  const expected = Buffer.from(getCronSecret());
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
  let sendLock: Awaited<ReturnType<typeof beginBriefingSend>> | null = null;

  try {
    const authorized = isAuthorized(request);
    if (!authorized && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401, headers: JSON_HEADERS },
      );
    }

    if (preview) {
      const digest = await buildBriefingDigest(now);
      return NextResponse.json({
        ok: true,
        preview: true,
        forced: force,
        digest,
      }, { headers: JSON_HEADERS });
    }

    sendLock = await beginBriefingSend(now);
    if (sendLock.status === "already_sent") {
      return NextResponse.json({
        ok: true,
        sent: false,
        skipped: true,
        reason: "already_sent",
        forced: force,
        idempotencyKey: sendLock.idempotencyKey,
        id: sendLock.record.emailId,
        sentAt: sendLock.record.sentAt,
        stories: sendLock.record.stories,
      }, { headers: JSON_HEADERS });
    }

    if (sendLock.status === "in_progress") {
      return NextResponse.json({
        ok: true,
        sent: false,
        skipped: true,
        reason: "send_in_progress",
        forced: force,
        idempotencyKey: sendLock.idempotencyKey,
      }, { status: 202, headers: JSON_HEADERS });
    }

    const digest = await buildBriefingDigest(now);

    if (digest.warnings.length > 0) {
      console.warn("Morning brief partial failure", {
        warnings: digest.warnings,
        timestamp: now.toISOString(),
      });
    }

    const emailId = await sendBriefingEmail(digest, {
      idempotencyKey: sendLock.idempotencyKey,
    });
    await sendLock.complete({
      emailId,
      dateLabel: digest.dateLabel,
      stories: digest.stories.length,
    });

    return NextResponse.json({
      ok: true,
      sent: true,
      forced: force,
      idempotencyKey: sendLock.idempotencyKey,
      id: emailId,
      stories: digest.stories.length,
      warnings: digest.warnings,
    }, { headers: JSON_HEADERS });
  } catch (error) {
    if (sendLock?.status === "acquired") {
      await sendLock.release().catch((releaseError) => {
        console.error("Failed to release morning brief send lock", {
          message: releaseError instanceof Error ? releaseError.message : "Unknown error",
          timestamp: now.toISOString(),
        });
      });
    }

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

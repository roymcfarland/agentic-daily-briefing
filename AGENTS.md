<!-- BEGIN:agent-rules -->
# Agent Execution Rules

This file contains tactical instructions for AI agents (Cursor, Claude Code, etc.) operating in this repository. For strategic intent, architecture, and PR enforcement rules, see `PROJECT.md`.

## Environment Setup

1. Copy `.env.example` to `.env.local`.
2. The app requires a valid `BLUEPRINT_API_BASE_URL` and `EXTERNAL_API_KEY` to fetch task data.
3. The app requires a valid `RESEND_API_KEY` to send emails.
4. Outside production, missing Redis configuration automatically uses an in-memory idempotency store; no mock credentials or bypass is needed. Production requires Upstash Redis or Vercel KV and fails closed without a persistent idempotency backend.
5. LLM summaries are optional. Set `AI_GATEWAY_API_KEY` locally to exercise them, or `BRIEFING_SUMMARIES_ENABLED=false` to skip them.

## Commands

- `npm run dev` — Start the Next.js dev server.
- `npm run test` — Run the Vitest suite.
- `npm run lint` — Type-check with `tsc --noEmit`.
- `npm run test:smoke` — Run the cron preview endpoint smoke tests.
- `npm run build` — Build the Next.js app for production.
- `npm run preview:email` — Render a fixture email to `/tmp/email-preview.html` and `/tmp/email-preview.txt` without network or environment access.
- `npm run generate:blueprint` — Regenerate the API client from the OpenAPI spec.

## Gotchas

- **Paused cron:** The Vercel Cron trigger is currently paused; see README → Resuming the daily brief.
- **Next.js config rewrites:** `next build` / `next dev` rewrite `tsconfig.json` (`jsx: react-jsx` and a `.next/dev/types` include). Discard that rewrite before committing.

- **Cron execution:** The app is designed to be triggered by Vercel Cron. To test the route locally, you must send a `GET` request to `/api/cron/morning-brief` with an `Authorization: Bearer <CRON_SECRET>` header.
- **Preview mode:** Append `?preview=1` to the cron URL to assemble the digest and return it as JSON without sending an email or acquiring an idempotency lock. This is the safest way to test the pipeline locally.
<!-- END:agent-rules -->

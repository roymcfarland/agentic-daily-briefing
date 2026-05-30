<!-- BEGIN:agent-rules -->
# Agent Execution Rules

This file contains tactical instructions for AI agents (Cursor, Claude Code, etc.) operating in this repository. For strategic intent, architecture, and PR enforcement rules, see `PROJECT.md`.

## Environment Setup

1. Copy `.env.example` to `.env.local`.
2. The app requires a valid `BLUEPRINT_API_BASE_URL` and `EXTERNAL_API_KEY` to fetch task data.
3. The app requires a valid `RESEND_API_KEY` to send emails.
4. Idempotency requires Upstash Redis or Vercel KV. If you are testing locally and do not have a Redis instance, you must either provide mock credentials or bypass the idempotency check for local dev only (do not commit bypasses).

## Commands

- `npm run dev` — Start the Next.js dev server.
- `npm run test` — Run the Vitest suite.
- `npm run generate:blueprint` — Regenerate the API client from the OpenAPI spec.

## Gotchas

- **Cron execution:** The app is designed to be triggered by Vercel Cron. To test the route locally, you must send a `GET` request to `/api/cron/morning-brief` with an `Authorization: Bearer <CRON_SECRET>` header.
- **Preview mode:** Append `?preview=1` to the cron URL to assemble the digest and return it as JSON without sending an email or acquiring an idempotency lock. This is the safest way to test the pipeline locally.
<!-- END:agent-rules -->

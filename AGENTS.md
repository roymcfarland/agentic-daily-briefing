<!-- BEGIN:agent-rules -->
# Agent Execution Rules

This file contains tactical instructions for AI agents (Cursor, Claude Code, etc.) operating in this repository. For strategic intent, architecture, and PR enforcement rules, see `PROJECT.md`.

## Environment Setup

1. Copy `.env.example` to `.env.local`.
2. The app requires a valid `BLUEPRINT_API_BASE_URL` and `EXTERNAL_API_KEY` to fetch task data.
3. The app requires a valid `RESEND_API_KEY` to send emails.
4. See the [README environment table](README.md#environment-variables) for the sender, recipients, cron authentication, Redis configuration, and optional summaries. Sends in production mode require a persistent idempotency backend. Outside production mode, missing Redis configuration uses an in-memory store.

## Commands

- `npm run dev` — Start the Next.js dev server.
- `npm run test` — Run the main Vitest suite.
- `npm run lint` — Type-check with `tsc --noEmit`.
- `npm run test:smoke` — Check that the cron route loads and exposes its runtime settings.
- `npm run build` — Build the Next.js app for production.
- `npm run preview:email` — Render a fixture email to `/tmp/email-preview.html` and `/tmp/email-preview.txt` without network calls or app configuration.
- `npm run generate:blueprint` — Regenerate the API client from the OpenAPI spec.

## Pull requests

- Push changes to a topic branch and open a pull request against `main`. See [README](README.md#security-and-automation) for required checks.
- Include relevant documentation and a [PR Sequencing](PROJECT.md#pr-sequencing-current-work) row in the same PR. Append a row using the existing format. Use `#TBD` before opening the PR and backfill the assigned number in that PR.
- GitHub deletes the source branch after merge. Remove scratch checkouts with `git worktree remove <path>` when finished.

## Gotchas

- **Paused cron:** The Vercel Cron trigger is currently paused. See [Resuming the daily brief](README.md#resuming-the-daily-brief).
- **Next.js config rewrites:** `next build` / `next dev` rewrite `tsconfig.json` (`jsx: react-jsx` and a `.next/dev/types` include). Discard that rewrite before committing.

- **Cron execution:** The app is designed to be triggered by Vercel Cron. To test the route locally, you must send a `GET` request to `/api/cron/morning-brief` with an `Authorization: Bearer <CRON_SECRET>` header.
- **Preview mode:** Append `?preview=1` to the cron URL to assemble the digest and return it as JSON without sending an email or acquiring an idempotency lock. It still assembles a live digest. Use the fixture email preview to check rendering without external calls.
<!-- END:agent-rules -->

# Daily Morning Brief

> **Status: paused (2026-09-29).** The daily Vercel Cron trigger has been removed from `vercel.json`, so no briefing emails are sent on a schedule. The route still exists and can still be invoked manually with `CRON_SECRET` (which **will** send an email unless `?preview=1` is used). See "Resuming the daily brief" below.

Next.js App Router project for a daily morning email briefing, designed for Vercel deployment and Vercel Cron.

## About this repo

This is the source of a personal production system I use every morning. It runs on Vercel Cron, fetches my open tasks from a separate internal API I built ([Workflow Blueprint](https://www.workflowblueprint.io)), pulls live news from a curated set of Google News RSS feeds, ranks everything for decision relevance, and emails me one digest at 6:00 AM Mountain. It is intentionally hardcoded for one reader and one set of beats; it is not a multi-user product.

The public landing page lives at [roymcfarland.news](https://www.roymcfarland.news).

If you want to understand the architectural reasoning, the constraints, and the rules a code-review agent enforces on every PR, read [`PROJECT.md`](./PROJECT.md) before the code itself. It is the authoritative source of truth for the project and gives more context than the code does on its own.

## What it does

- Sends a daily morning briefing email with [Resend](https://resend.com/)
- Runs from `/api/cron/morning-brief`
- Pulls task state from the Workflow Blueprint v1 API via `getDailySummary` only
- Groups tasks by the categories returned by Workflow Blueprint
- Pulls live research from Google News RSS across AI, Markets, Business, CPG Startups, Chicago, Colorado, and Asymmetric Upside
- Covers Denver Broncos, Colorado Buffaloes Football, Notre Dame Football, and ATP + WTA Tennis
- Optionally enriches selected stories with LLM article summaries through the Vercel AI Gateway, falling back to the RSS description
- Removes duplicates and low-signal items
- Ranks for implication and decision relevance
- Ends with one thing to watch, one thing to ignore, and one contrarian take

## Project structure

- `app/api/cron/morning-brief/route.ts`: cron entrypoint and authorization
- `lib/blueprint/generated/client.ts`: generated Workflow Blueprint API client
- `openapi/blueprint.openapi.json`: source schema for the generated client
- `lib/briefing/pipeline.ts`: data collection, ranking, and digest assembly
- `lib/briefing/formatter.ts`: HTML and text email rendering
- `app/page.tsx`: public landing page
- `lib/research/`: Google News RSS, URL resolution, article fetch, summarizer, and topic configuration
- `lib/briefing/enrich.ts`: selected-story summary enrichment and hit-rate logging
- `lib/briefing/idempotency.ts`: daily send records and idempotency locks
- `lib/resend.ts`: email delivery through Resend
- `lib/env.ts`: environment variable parsing and validation
- `scripts/preview-email.mjs`: local fixture email preview runner
- `tests/smoke/`: cron preview endpoint smoke tests
- `vercel.json`: Vercel Cron config (currently empty; the app is paused)

## Why one Vercel cron schedule

The schedule is currently disabled (see the Status note above); the following describes the schedule restored when resuming.

Vercel Cron uses UTC schedules. This project is configured with one daily cron at `0 12 * * *`.

That means:

1. It sends once per day, not twice.
2. On April 4, 2026, that schedule maps to `6:00 AM America/Denver`.
3. After daylight saving time ends, it will map to `5:00 AM America/Denver` unless you adjust the UTC schedule.

## Environment variables

Copy `.env.example` to `.env.local` for local development and configure the same values in Vercel production:

```bash
cp .env.example .env.local
```

Required values:

- `BLUEPRINT_API_BASE_URL`
- `EXTERNAL_API_KEY`
- `RESEND_API_KEY`
- `BRIEFING_FROM_EMAIL`
- `BRIEFING_TO_EMAILS`
- `CRON_SECRET`
- `BRIEFING_IDEMPOTENCY_REDIS_REST_URL`
- `BRIEFING_IDEMPOTENCY_REDIS_REST_TOKEN`

Optional values:

- `BLUEPRINT_TIMEOUT_MS`
- `BRIEFING_SUBJECT_PREFIX`
- `BRIEFING_MAX_ITEMS`
- `BRIEFING_IDEMPOTENCY_SENT_TTL_SECONDS`
- `BRIEFING_IDEMPOTENCY_LOCK_TTL_SECONDS`
- `BRIEFING_SUMMARY_MODEL`: defaults to `openai/gpt-5.4-mini`
- `BRIEFING_SUMMARIES_ENABLED`: summaries are enabled by default; set to `false` to disable them
- `AI_GATEWAY_API_KEY`: read by the AI SDK for local summary generation; Vercel uses automatic OIDC authentication

The idempotency variables can use the project-specific names above, Vercel KV's `KV_REST_API_URL` / `KV_REST_API_TOKEN` aliases, or Upstash's `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` aliases. Production sends fail closed without a persistent idempotency backend so cron retries cannot double-send. Outside production, missing Redis configuration automatically falls back to an in-memory store.

## Local development

Install dependencies:

```bash
npm install
```

Generate the upstream API client from the OpenAPI schema:

```bash
npm run generate:blueprint
```

Start the app:

```bash
npm run dev
```

Manually trigger the cron route in development:

**Warning:** This sends a real email when Resend is configured; use `?preview=1` to avoid sending.

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/morning-brief
```

Preview the assembled briefing without sending email:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/morning-brief?preview=1"
```

Production domain:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://www.roymcfarland.news/api/cron/morning-brief?preview=1"
```

## What I'd do differently if I started over

A few things I would change with the benefit of hindsight, kept here for honesty rather than polish:

1. **The ranker is mostly hand-tuned regex and source weights.** It works well enough that I read the brief every morning, but it is fragile to topic drift. A small evaluation harness — a few dozen labeled stories per beat, scored against the current ranker — would make changes safer and let me swap the heuristic layer for a small LLM judge without guessing whether quality regressed.
2. **Idempotency lives in two places.** The route uses Redis/Upstash to lock the day, and Resend's own idempotency key is passed as a backstop. That belt-and-suspenders design has saved me from double sends, but it also means the truth about "did today's brief send" is split across two systems. A single durable record with a clear state machine would be cleaner.
3. **No structured observability.** Failures show up in Vercel function logs and (sometimes) in the email itself as a warning banner. For a tool I depend on daily, I should have a tiny `/api/health` summary plus a once-a-week digest of partial failures, rather than relying on me noticing a missing brief.
4. **The landing page and the cron job share a Next.js app for convenience.** That is fine today, but if the briefing logic ever needed a heavier runtime (e.g., a real LLM judge), the right move would be to split the cron into its own service so the marketing site stays static and cheap.
5. **`PROJECT.md` was added late.** The verifier rules and non-goals would have prevented at least three of the dumber refactors I made early on. If I were starting again, I would write `PROJECT.md` before the first commit, not after the tenth.

## License

This project is licensed under the PolyForm Noncommercial License 1.0.0. See the [LICENSE](LICENSE) file for details. Commercial use is strictly prohibited without express written permission from Roy McFarland.

## Resuming the daily brief

Restore this exact content in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/morning-brief",
      "schedule": "0 12 * * *"
    }
  ]
}
```

Merging this change to `main` redeploys production and re-creates the daily cron job. Update the paused status notes in this README and PROJECT.md when resuming.

## Deploy to Vercel

1. Import the repo into Vercel.
2. Set the environment variables from `.env.example`.
3. Ensure your sender domain is verified in Resend.
4. Set `CRON_SECRET` in Vercel and call the route with that shared secret.
5. Point `roymcfarland.news` and `www.roymcfarland.news` at the Vercel project.
6. Deploy. Vercel creates the cron job from `vercel.json` only when a `crons` entry is present; the array is currently empty, so no cron job is created.

## Upstream API client generation

The generated client is intentionally scoped to `getDailySummary`, which is the only upstream API method used by this app today.

If the upstream schema changes:

1. Update `openapi/blueprint.openapi.json`
2. Run `npm run generate:blueprint`
3. Commit the regenerated `lib/blueprint/generated/client.ts`

## Testing

Run the same four checks as CI:

```bash
npm run lint
npm test
npm run test:smoke
npm run build
```

For a local visual check of the email, run `npm run preview:email` and open `/tmp/email-preview.html` (a text version is also written to `/tmp/email-preview.txt`). The preview uses a fixture digest without network or environment access.

## Production notes

- The route uses `getDailySummary` only and does not rely on any upstream dashboard behavior.
- Research is gathered live at send time from public RSS search results, then deduped and ranked.
- Selected stories are enriched in order: Google News URL resolution → article text fetch → LLM summary, with fallback to the original RSS description on failure and enrichment hit-rate logging.
- If a feed fails, the pipeline continues with the remaining sources.
- The route returns JSON so Vercel Cron logs stay readable.
- `preview=1` can be used on an authenticated request to inspect the assembled digest without sending email.
- Sent emails use a stable Chicago-date idempotency key in Redis/Upstash and Resend, so duplicate cron retries for the same day return the persisted send record instead of sending again.

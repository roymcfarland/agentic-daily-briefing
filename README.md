# Daily Morning Brief

> **Status: paused (2026-09-29).** The daily Vercel Cron trigger has been removed from `vercel.json`, so no briefing emails are sent on a schedule. The route still exists and can still be invoked manually with `CRON_SECRET` (which can send an email unless `?preview=1` is used). See "Resuming the daily brief" below.

This is the source of a personal morning email briefing designed to run on Vercel Cron. It fetches my open tasks from a separate internal API I built ([Workflow Blueprint](https://www.workflowblueprint.io)), pulls live news from a curated set of Google News RSS feeds, ranks stories for decision relevance, and emails one digest to a configured list of recipients. The beats are fixed and the briefing is designed for a single reader.

The public landing page lives at [roymcfarland.news](https://www.roymcfarland.news). While the cron is paused (`vercel.json` has an empty `crons` array, so nothing fires), the page still shows a 6:00 AM Mountain delivery time and says a Vercel Cron job fires daily at 12:00 UTC; both statements describe the paused schedule, not current behavior. The page no longer invites sign-ups; visitors are directed to roy@brightline.io to ask about receiving the brief.

If you want to understand the architectural reasoning, the constraints, and the rules a code-review agent enforces on every PR, read [`PROJECT.md`](./PROJECT.md) before the code itself. It is the authoritative source of truth for the project and gives more context than the code does on its own. [AGENTS.md](AGENTS.md) covers contributor and agent workflows.

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
- `tests/smoke/`: cron route smoke tests
- `vercel.json`: Vercel Cron config (currently empty; the app is paused)

## Why one Vercel cron schedule

Restoring the daily schedule adds one trigger at 12:00 UTC (`0 12 * * *`). In `America/Denver` that is 6:00 AM during daylight saving time and 5:00 AM during standard time.

## Environment variables

Copy the template for local development. On Vercel, set the briefing configuration in the environment where you intend to invoke the route.

```bash
cp .env.example .env.local
```

| Name | Purpose | Required? | Where to set |
|---|---|---|---|
| `BLUEPRINT_API_BASE_URL` | Workflow Blueprint API base URL | Yes for cron requests | Local / Vercel |
| `EXTERNAL_API_KEY` | Workflow Blueprint API authentication | Yes for cron requests | Local / Vercel |
| `RESEND_API_KEY` | Resend authentication | Required in configuration for preview and send | Local / Vercel |
| `BRIEFING_FROM_EMAIL` | Sender address | Required in configuration for preview and send | Local / Vercel |
| `BRIEFING_TO_EMAILS` | Comma-separated recipient addresses | Required in configuration for preview and send | Local / Vercel |
| `CRON_SECRET` | Cron route bearer authentication | Yes for preview and send requests | Local / Vercel |
| `BRIEFING_IDEMPOTENCY_REDIS_REST_URL`, `KV_REST_API_URL`, `UPSTASH_REDIS_REST_URL` | Redis REST endpoint, in lookup order | One for sends when Next.js runs in production mode | Local / Vercel |
| `BRIEFING_IDEMPOTENCY_REDIS_REST_TOKEN`, `KV_REST_API_TOKEN`, `UPSTASH_REDIS_REST_TOKEN` | Redis REST authentication, in lookup order | One for sends when Next.js runs in production mode | Local / Vercel |
| `BRIEFING_IDEMPOTENCY_SENT_TTL_SECONDS` | Redis retention for a completed send | Optional | Local / Vercel |
| `BRIEFING_IDEMPOTENCY_LOCK_TTL_SECONDS` | Redis retention for an in-progress send lock | Optional | Local / Vercel |
| `BLUEPRINT_TIMEOUT_MS` | Blueprint request timeout | Optional | Local / Vercel |
| `BRIEFING_SUBJECT_PREFIX` | Email subject prefix | Optional | Local / Vercel |
| `BRIEFING_MAX_ITEMS` | Maximum stories selected for the digest (clamped to 10-20; default 10) | Optional | Local / Vercel |
| `BRIEFING_SUMMARY_MODEL` | Override the default Gateway model in [the summarizer](lib/research/summarize.ts) | Optional | Local / Vercel |
| `BRIEFING_SUMMARIES_ENABLED` | Control article summaries, which are enabled by default | Optional | Local / Vercel |
| `AI_GATEWAY_API_KEY` | AI SDK key for Gateway authentication | Optional for local summaries | Local |
| `VERCEL_OIDC_TOKEN` | Vercel OIDC fallback used by the Gateway SDK | Automatic on Vercel with OIDC enabled | Vercel runtime |
| `NODE_ENV` | Controls production idempotency, URL validation, and error details | Set automatically | Next.js runtime |

The preview route validates the briefing configuration and can call Blueprint, Google News, and the AI Gateway while assembling the digest. It skips email delivery and the idempotency store. In production mode, sends fail closed without a persistent idempotency backend. Outside production mode, missing Redis configuration falls back to an in-memory store.

## Local development

The stack is Next.js 16 App Router, React 19, TypeScript 6, and Vitest 5. See [package.json](package.json) for dependency ranges and [package-lock.json](package-lock.json) for resolved versions.

Use Node 24 LTS at the exact pin in [.nvmrc](.nvmrc) and the npm bundled with that Node release, as CI does. Put that bundled npm first on your PATH and avoid a different global npm or pnpm. Install from the committed npm lockfile.

```bash
nvm install
nvm use
npm ci
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

1. **The ranker is mostly hand-tuned regex and source weights.** It worked well enough for daily use, but it is fragile to topic drift. A small evaluation harness — a few dozen labeled stories per beat, scored against the current ranker — would make changes safer and let me swap the heuristic layer for a small LLM judge without guessing whether quality regressed.
2. **Idempotency lives in two places.** The route uses Redis/Upstash to lock the day, and Resend's own idempotency key is passed as a backstop. That belt-and-suspenders design has saved me from double sends, but it also means the truth about "did today's brief send" is split across two systems. A single durable record with a clear state machine would be cleaner.
3. **No structured observability.** Failures show up in Vercel function logs and (sometimes) in the email itself as a warning banner. For a tool I depend on daily, I should have a tiny `/api/health` summary plus a once-a-week digest of partial failures, rather than relying on me noticing a missing brief.
4. **The landing page and the cron job share a Next.js app for convenience.** That is fine today, but if the briefing logic ever needed a heavier runtime (e.g., a real LLM judge), the right move would be to split the cron into its own service to keep the marketing site small.
5. **`PROJECT.md` was added late.** The verifier rules and non-goals would have prevented at least three of the dumber refactors I made early on. If I were starting again, I would write `PROJECT.md` before the first commit, not after the tenth.

## License

This project is licensed under the PolyForm Noncommercial License 1.0.0. See the [LICENSE](LICENSE) file for details. For commercial licensing requests, contact Roy McFarland.

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

The Vercel Git integration builds preview deployments for pull requests and deploys production from `main`. A Vercel preview is a deployment of the branch. The cron route's `?preview=1` option controls whether a request sends email.

1. Import the repo into Vercel.
2. Configure the [environment variables](#environment-variables) for the intended Vercel environment.
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

[CI](.github/workflows/ci.yml) runs lint, tests, smoke tests, and a production build on pull requests and pushes to `main`. The `lint` script type-checks the app. The `lint` job also audits production dependencies. Smoke tests check that the cron route loads and exposes the expected runtime settings.

Run the CI commands locally. The production build fetches Google Fonts.

```bash
npm audit --omit=dev --audit-level=high
npm run lint
npm test
npm run test:smoke
npm run build
```

For a local visual check of the email, run `npm run preview:email` and open `/tmp/email-preview.html` (a text version is also written to `/tmp/email-preview.txt`). The preview uses a fixture digest without network calls or app configuration.

## Security and automation

- [Dependabot](.github/dependabot.yml) checks npm and GitHub Actions monthly, with up to three open version-update PRs per ecosystem. It groups npm minor and patch updates and groups GitHub Actions updates together. It skips major version updates for `@types/node`, `typescript`, and `ai`. [package.json](package.json) also sets a PostCSS override.
- GitHub CodeQL runs on pull requests. The repository currently has no Gitleaks workflow or configuration.
- The protected `main` branch requires an up-to-date PR with passing `Vercel`, `lint`, `smoke`, and `test` checks.
- Report vulnerabilities privately using [SECURITY.md](SECURITY.md).

## Production notes

- The route uses `getDailySummary` only and does not rely on any upstream dashboard behavior.
- Research is gathered live at send time from public RSS search results, then deduped and ranked.
- Selected stories are enriched in order: Google News URL resolution → article text fetch → LLM summary, with fallback to the original RSS description on failure and enrichment hit-rate logging.
- If a feed fails, the pipeline continues with the remaining sources.
- The route returns JSON so Vercel Cron logs stay readable.
- `preview=1` can be used on an authenticated request to inspect the assembled digest without sending email.
- Sends use a stable Chicago-date idempotency key for the Redis record and the Resend request. A same-day retry with a completed record returns the stored send details. A retry with a pending lock skips the send while it is in progress.

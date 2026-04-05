# Daily Morning Brief

Next.js App Router project for a daily morning email briefing, designed for Vercel deployment and Vercel Cron.

## What it does

- Sends a daily morning briefing email with [Resend](https://resend.com/)
- Runs from `/api/cron/morning-brief`
- Pulls task state from Taskflow via `getDailySummary` only
- Covers Personal, Elevated Organics, and Brightline Labs
- Pulls live research from Google News RSS across AI, Markets, Business, Cannabis, Chicago, Colorado, and one asymmetric-upside area
- Removes duplicates and low-signal items
- Ranks for implication and decision relevance
- Ends with one thing to watch, one thing to ignore, and one contrarian take

## Project structure

- `app/api/cron/morning-brief/route.ts`: cron entrypoint and authorization
- `lib/taskflow/generated/client.ts`: generated Taskflow API client
- `openapi/taskflow.openapi.json`: source schema for the generated client
- `lib/briefing/pipeline.ts`: data collection, ranking, and digest assembly
- `lib/briefing/formatter.ts`: HTML and text email rendering
- `vercel.json`: UTC cron schedule with a Chicago-time runtime guard

## Why one Vercel cron schedule

Vercel Cron uses UTC schedules. This project is configured with one daily cron at `30 11 * * *` and a runtime guard that only sends when the local Chicago time is exactly `6:30 AM`.

That means:

1. It sends once per day, not twice.
2. It matches `6:30 AM America/Chicago` during daylight time.
3. It will drift during standard time unless you reintroduce a second UTC schedule.

## Environment variables

Copy `.env.example` to `.env.local` for local development and configure the same values in Vercel production:

```bash
cp .env.example .env.local
```

Required values:

- `TASKFLOW_API_BASE_URL`
- `TASKFLOW_API_KEY`
- `RESEND_API_KEY`
- `BRIEFING_FROM_EMAIL`
- `BRIEFING_TO_EMAILS`
- `CRON_SECRET`

Optional values:

- `TASKFLOW_TIMEOUT_MS`
- `BRIEFING_SUBJECT_PREFIX`
- `BRIEFING_MAX_ITEMS`

## Local development

Install dependencies:

```bash
npm install
```

Generate the Taskflow client from the OpenAPI schema:

```bash
npm run generate:taskflow
```

Start the app:

```bash
npm run dev
```

Manually trigger the cron route in development:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/morning-brief
```

Force a manual send outside the normal 6:30 AM America/Chicago cron window:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/morning-brief?force=1"
```

Preview the assembled briefing without sending email:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/morning-brief?preview=1"
```

Preview the assembled briefing outside the normal send window:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/morning-brief?force=1&preview=1"
```

Production domain:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://www.roymcfarland.news/api/cron/morning-brief?preview=1"
```

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://www.roymcfarland.news/api/cron/morning-brief?force=1"
```

## Deploy to Vercel

1. Import the repo into Vercel.
2. Set the environment variables from `.env.example`.
3. Ensure your sender domain is verified in Resend.
4. Set `CRON_SECRET` in Vercel and call the route with that shared secret.
5. Point `roymcfarland.news` and `www.roymcfarland.news` at the Vercel project.
6. Deploy. Vercel will pick up `vercel.json` and create the cron job.

## Taskflow client generation

The generated client is intentionally scoped to `getDailySummary`, which is the only Taskflow method used by this app.

If the Taskflow schema changes:

1. Update `openapi/taskflow.openapi.json`
2. Run `npm run generate:taskflow`
3. Commit the regenerated `lib/taskflow/generated/client.ts`

## Testing

Run the formatter and ranker tests with:

```bash
npm test
```

## Production notes

- The route uses `getDailySummary` only and does not rely on any Taskflow dashboard behavior.
- Research is gathered live at send time from public RSS search results, then deduped and ranked.
- If a feed fails, the pipeline continues with the remaining sources.
- The route returns JSON so Vercel Cron logs stay readable.
- `force=1` can be used on an authenticated request for manual testing outside the scheduled send window.
- `preview=1` can be used on an authenticated request to inspect the assembled digest without sending email.

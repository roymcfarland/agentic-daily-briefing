# Weekday Morning Brief

Next.js App Router project for a weekday morning email briefing, designed for Vercel deployment and Vercel Cron.

## What it does

- Sends a weekday morning briefing email with [Resend](https://resend.com/)
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
- `vercel.json`: UTC cron schedules with a Chicago-time runtime guard

## Why two Vercel cron schedules

Vercel Cron uses UTC schedules. America/Chicago moves between CST and CDT, so a single UTC cron cannot stay pinned to 6:30 AM local time year-round.

This project solves that by:

1. Scheduling both `30 11 * * 1-5` and `30 12 * * 1-5`
2. Checking the current time in `America/Chicago` inside the route
3. Only sending when the local time is exactly 6:30 AM on a weekday

That keeps the actual send time aligned with 6:30 AM Chicago through DST changes.

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

## Deploy to Vercel

1. Import the repo into Vercel.
2. Set the environment variables from `.env.example`.
3. Ensure your sender domain is verified in Resend.
4. Set `CRON_SECRET` in Vercel and call the route with that shared secret.
5. Deploy. Vercel will pick up `vercel.json` and create the cron jobs.

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

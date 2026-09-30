> **Authority and Precedence:** This document is the authoritative source of truth for the Agentic Daily Briefing project. It supersedes all other documentation, including `README.md`, `AGENTS.md`, and inline code comments. The Verifier agent MUST hard-fail any PR that violates these rules. Any PR that surfaces a conflict between these sources MUST resolve the conflict in the same PR.

## How to use this document

- **If you are a Builder agent:** Read this document first to understand the architecture, constraints, and non-goals before writing any code.
- **If you are a Verifier agent:** Audit every PR against the rules in this document. Hard-fail any PR that violates a rule or non-goal.

## Document Map

1. `PROJECT.md` (This file) — Strategic intent, architecture rules, and PR enforcement.
2. `AGENTS.md` — Tactical execution rules (how to run the app, environment setup).
3. `README.md` — Human-facing documentation and deployment instructions.
4. `CLAUDE.md` — Redirect pointer for Claude Code.

## Purpose

Agentic Daily Briefing is a proprietary Next.js application with two distinct surfaces:

1. **Primary product surface — daily briefing cron job.** A Vercel Cron job that aggregates live research (via Google News RSS) and task state (via the Workflow Blueprint v1 API), ranks the items for decision relevance, and sends a daily morning email briefing to the founder. It is designed for extreme reliability, idempotency, and graceful degradation. This is where the active development work happens. **Currently paused (2026-09-29):** the cron entry has been removed from `vercel.json`; restore it to resume (see README → Resuming the daily brief).
2. **Secondary surface — public landing page.** A static marketing landing page served at `roymcfarland.news` and `www.roymcfarland.news`. This page exists deliberately and is preserved, but is intentionally minimal. No new pages, components, or interactive features should be added to this surface without an explicit PROJECT.md update.

## Non-goals

1. **Not a multi-user SaaS product** — The app is hardcoded to send to a specific list of recipients (`BRIEFING_TO_EMAILS`). There is no user management, no database of preferences, and no authenticated UI.
2. **Not a generic newsletter tool** — The research topics, ranking logic, and email formatting are highly specific to the founder's operational needs (task categories from the founder's Workflow Blueprint account, plus a fixed set of news and sports beats).
3. **Not a stateful application** — The app has no primary database. It uses Vercel KV / Upstash Redis exclusively for idempotency locks to prevent double-sends.
4. **Not an expanded marketing site** — The public landing page surface is deliberately minimal. New pages, interactive features, blog posts, signup forms, or analytics integrations are forbidden without an explicit PROJECT.md update authorizing them.

## Architecture & Stack

- **Framework:** Next.js 16.x App Router, React 19.
- **Runtime:** Node.js 24 LTS, declared in `package.json` `engines.node` as `24.x` and pinned to a concrete 24 LTS patch in `.nvmrc` (see Verifier Rule 4 for the authoritative pin and rationale).
- **Deployment:** Vercel (Serverless Functions + static landing page) triggered by Vercel Cron for the briefing job; the cron trigger is currently paused (PR #35).
- **Email:** Resend.
- **AI summaries:** Vercel AI SDK (`ai`) through the Vercel AI Gateway optionally enriches selected stories in order: Google News URL resolution → article text fetch → LLM summary (default model `openai/gpt-5.4-mini`), with fallback to the RSS description on failure and enrichment hit-rate logging.
- **Idempotency:** Vercel KV / Upstash Redis REST API, with fail-closed behavior in production.
- **External API Consumption:** Consumes the Workflow Blueprint v1 task-management API via a generated TypeScript client driven by an OpenAPI spec.

## Verifier Rules (Enforced on every PR)

### 1. Test Coverage
- **Hard-fail** any PR that adds or modifies business logic in `lib/briefing/`, `lib/blueprint/`, or `app/api/cron/` without accompanying tests.
- **Hard-fail** any PR that removes the `test`, `test:smoke`, or `lint` scripts from `package.json`.

### 2. Continuous Integration
- **Hard-fail** any PR that deletes, disables, or removes a job from `.github/workflows/ci.yml`.
- **Hard-fail** any PR that bypasses required CI checks via admin override without a documented PROJECT.md emergency note.

### 3. Idempotency (Critical — protects against double-sending the morning email)
- **Hard-fail** any PR that modifies `lib/briefing/idempotency.ts` or `app/api/cron/morning-brief/route.ts` without accompanying tests.
- **Hard-fail** any PR that removes the "fail-closed without idempotency backend" behavior in production.
- **Hard-fail** any PR that adds a new email-send code path that bypasses `beginBriefingSend()`.

### 4. Node Version Pinning
- The project pins Node.js to **Node 24 LTS**. This is enforced at three sites, each using the syntax appropriate to its tool:
  - `package.json` `engines.node`: `24.x` (npm/pnpm semver-range form; any Node 24 release satisfies the known rolldown floor).
  - `.nvmrc`: a concrete Node 24 LTS patch, currently `24.16.0` (nvm form; nvm does not support `.x`).
  - `.github/workflows/ci.yml`: must use `node-version-file: .nvmrc` (so CI reads the same source of truth as local development).
- **Why Node 24 LTS:** Node 24 is the current LTS line and satisfies the Vitest 4 / rolldown native binding requirement of runtime >= 22.12 on `ubuntu-latest`, so the minor no longer needs to be pinned in `engines.node` (hence `24.x`). The original 22.12 floor existed for rolldown native bindings; see npm/cli#4828 for the binding-loading failure mode.
- **Hard-fail** any PR that changes `package.json` `engines.node` without updating `.nvmrc`, preserving `.github/workflows/ci.yml` as `node-version-file: .nvmrc`, and updating this rule.
- **Hard-fail** any PR that changes `.nvmrc` without updating `package.json` `engines.node`, preserving `.github/workflows/ci.yml` as `node-version-file: .nvmrc`, and updating this rule.
- **Hard-fail** any PR that removes any of those three pin sites.
- **Hard-fail** any PR that introduces a literal Node version in `ci.yml` (e.g. `node-version: 24`) instead of `node-version-file: .nvmrc`.

### 5. OpenAPI Client Generation
- **Hard-fail** any PR that manually edits `lib/blueprint/generated/client.ts` without updating the source OpenAPI spec at `openapi/blueprint.openapi.json` and re-running the generation script. The OpenAPI spec is the source of truth for the external contract.

### 6. Landing Page Surface Lock
- **Hard-fail** any PR that adds new pages under `app/` (other than the existing `app/page.tsx`, `app/layout.tsx`, and image generators), new interactive components under `app/components/`, signup forms, analytics scripts, or third-party tracking pixels, without an explicit PROJECT.md update authorizing the change.

### 7. Legacy Blueprint Migration Env Names
- **Hard-fail** any PR that re-introduces legacy `TASKFLOW_*` or `READ_ONLY_API_KEY` env-var references in `lib/env.ts`, `lib/env.test.ts`, `lib/blueprint/`, or any new code. The Blueprint migration is complete; legacy names are forbidden.

## PR Sequencing (Current Work)

| PR | Scope | Status |
|---|---|---|
| **PR 1 (Install + Harness)** | PROJECT.md, LICENSE, AGENTS.md, CLAUDE.md, GitHub Actions CI (`lint`, `test`, `smoke`), Node pinning (`22.12.x`), `test:smoke` script, smoke test for the preview endpoint, README scrub for naming neutrality. | Shipped |
| **PR 2 (Migration)** | Rename all legacy upstream references to `Blueprint` (directories, env vars, OpenAPI spec, generated client, user-facing strings). Update OpenAPI spec to match Workflow Blueprint's v1 API contract. Regenerate client. Migrate consumer to use `EXTERNAL_API_KEY` and the new v1 endpoints. Coordinate with the corresponding deprecation work in the `workflow-blueprint` repo. | Shipped |
| **PR 3 (Consumer migration)** | Migrate the consumer side of the Blueprint v1 API: route, ranker, and tests now read `EXTERNAL_API_KEY` and call the regenerated v1 client. Companion to PR 2 on the consumer repo. (Merged as `a843b3f`.) | Shipped |
| **PR 4 (Env hotfix)** | Transitional fix: tolerate legacy `TASKFLOW_*` env aliases in `lib/env.ts` so the morning-brief route stops 500'ing during the Blueprint env rename window. Superseded by PR 5. (Merged as `6fea610`.) | Shipped |
| **PR 5 (Cleanup)** | Remove the transitional legacy env-var alias shim added during the Blueprint migration, require canonical Blueprint env vars only, document the legacy-name hard-fail rule, and confirm production idempotency uses Vercel KV / Upstash Redis REST. | Shipped |
| **PR 6 (Editorial-dashboard email)** | Daily Digest email redesign in `lib/briefing/formatter.ts`: scoreboard strip, story cards with signal/noise chips and freshness dots, hero Decision Lens, dark-mode `prefers-color-scheme` block, muted editorial palette. Adds `lib/briefing/formatter-derived.ts` for digest stats with focused tests, and `npm run preview:email` for local visual review. (Merged as `623708a`.) | Shipped |
| **#7 (Ledger backfill)** | Backfill the PR Sequencing rows for merged PRs #3, #4, and #6. | Shipped |
| **#8 (Email hierarchy)** | Add a hero lead story, pull-quote Decision Lens, anchored scoreboard, and an “If you only read one thing” pointer. | Shipped |
| **de29798 (Public-release prep, no PR)** | Remove Elevated Organics and cannabis coverage, derive generated category checks from the OpenAPI enum, and add README portfolio context. | Shipped |
| **#9 (Shared errors)** | Extract a shared getErrorMessage utility for the pipeline and Resend error handling. | Shipped |
| **#10 (Shared freshness)** | Extract the shared ageInHours helper without changing freshness thresholds or presentation. | Shipped |
| **#11 (Shared text normalization)** | Extract normalizeText for shared comparison and canonicalization logic. | Shipped |
| **#12 (Dynamic task categories)** | Surface all Blueprint task categories dynamically, humanize category labels, and regenerate the client from the updated OpenAPI schema. | Shipped |
| **#13 (Blueprint diagnostics)** | Classify authentication errors and report active tasks dropped or missing from display. | Shipped |
| **#14 (Cron auth and locks)** | Enforce cron authorization in every environment and preserve the lock after a successful send if recording completion fails. | Shipped |
| **#15 (Email URL allowlist)** | Apply a URL scheme allowlist to story links in HTML and plain-text email rendering. | Shipped |
| **#16 (Send timeout)** | Add a 15-second client-side timeout to Resend email sends. | Shipped |
| **#17 (Dependency patches)** | Update Next.js to ^15.5.18 and fast-xml-parser to ^5.8.0. | Shipped |
| **#18 (Lock timing)** | Build the digest before acquiring the idempotency lock so digest build failures cannot strand it. | Shipped |
| **#19 (RSS text cleanup)** | Strip HTML tags from RSS titles and source names while preserving story URLs. | Shipped |
| **#20 (Sports label preservation)** | Preserve sports metadata through ranking and remove the URL re-lookup and tennis fallback. | Shipped |
| **#21 (Remove dead force parameter)** | Remove the unused force parameter from the cron route and correct its documentation. | Shipped |
| **#22 (Summary-first email)** | Make story cards summary-first with linked titles, remove second-order effects, and use whyItMatters for the lead-story pointer. | Shipped |
| **#23 (Article fetcher)** | Add a bounded article-text fetcher that returns an empty string on failure, before pipeline integration. | Shipped |
| **#24 (AI Gateway summarizer)** | Add the AI SDK article summarizer through the Vercel AI Gateway with an overridable model and RSS fallback, before pipeline integration. | Shipped |
| **#25 (Summary enrichment)** | Wire article fetching and LLM summaries into selected-story enrichment while retaining the RSS summary on failure. | Shipped |
| **#26 (Google News URL resolution)** | Resolve Google News redirect URLs before article fetching to activate summary enrichment. | Shipped |
| **#27 (Node 24 LTS)** | Move runtime pins and Node types to Node 24 LTS and update the project runtime rule. | Shipped |
| **#28 (Enrichment logging)** | Log enrichment totals, fallback counts, and hit rate for nonempty selected-story batches. | Shipped |
| **#29 (Next.js 16)** | Upgrade Next.js from 15 to 16 along with React 19.2 patches and React type updates. | Shipped |
| **#30 (CI build gate)** | Add a production build job to CI for pull requests and pushes to main. | Shipped |
| **#31 (TypeScript 6)** | Upgrade the TypeScript development dependency from 5 to ^6.0.3. | Shipped |
| **#32 (Longer summaries)** | Expand article summaries to four or five sentences and raise the output budget to 420 tokens. | Shipped |
| **#33 (Cron duration headroom)** | Raise the cron route maxDuration from 60 to 120 seconds with a route configuration regression test. | Shipped |
| **#34 (Resend 6)** | Upgrade the Resend SDK from 4 to 6 without changing the email-send implementation. | Shipped |
| **#35 (Pause cron)** | Pause the daily briefing by emptying the `crons` array in `vercel.json`; route, idempotency, and pipeline unchanged. README and PROJECT.md document the paused state and the resume block. | Shipped |
| **#36 (Docs accuracy sweep)** | Align README, PROJECT.md, and AGENTS.md with current code; backfill PR Sequencing rows #7–#34; correct the landing-page "Next delivery" idempotency sentence. | Shipped |
| **#37 (Audit fix)** | Lockfile-only refresh clearing 12 npm audit advisories (next 16.3.7, sharp 0.35.5, postcss 8.5.28, ai 6.0.296, vitest 4.1.11, tsx 4.23.15/esbuild 0.28.2); no package.json or source changes. | Shipped |
| **#<pending> (Pin rolldown binding)** | CI `test`/`smoke` jobs install `@rolldown/binding-linux-x64-gnu` pinned to the lockfile's `rolldown` version instead of latest; no job added or removed. | Shipped |

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

1. **Primary product surface — daily briefing cron job.** A Vercel Cron job that aggregates live research (via Google News RSS) and task state (via the upstream task-management API, currently exposed under the legacy `Taskflow` naming pending PR 3 migration to Workflow Blueprint), ranks the items for decision relevance, and sends a daily morning email briefing to the founder. It is designed for extreme reliability, idempotency, and graceful degradation. This is where the active development work happens.
2. **Secondary surface — public landing page.** A static marketing landing page served at `roymcfarland.news` and `www.roymcfarland.news`. This page exists deliberately and is preserved, but is intentionally minimal. No new pages, components, or interactive features should be added to this surface without an explicit PROJECT.md update.

## Non-goals

1. **Not a multi-user SaaS product** — The app is hardcoded to send to a specific list of recipients (`BRIEFING_TO_EMAILS`). There is no user management, no database of preferences, and no authenticated UI.
2. **Not a generic newsletter tool** — The research topics, ranking logic, and email formatting are highly specific to the founder's operational needs (Personal, Elevated Organics, Brightline Labs, etc.).
3. **Not a stateful application** — The app has no primary database. It uses Vercel KV / Upstash Redis exclusively for idempotency locks to prevent double-sends.
4. **Not an expanded marketing site** — The public landing page surface is deliberately minimal. New pages, interactive features, blog posts, signup forms, or analytics integrations are forbidden without an explicit PROJECT.md update authorizing them.

## Architecture & Stack

- **Framework:** Next.js 15.5.x App Router, React 19.
- **Runtime:** Node.js 22.11.x, declared in `package.json` `engines.node` and pinned in `.nvmrc`.
- **Deployment:** Vercel (Serverless Functions + static landing page) triggered by Vercel Cron for the briefing job.
- **Email:** Resend.
- **Idempotency:** Upstash Redis / Vercel KV REST API, with fail-closed behavior in production.
- **External API Consumption:** Consumes a task-management API (currently the legacy Taskflow surface, pending PR 3 migration to the Workflow Blueprint v1 API) via a generated TypeScript client driven by an OpenAPI spec.

## Verifier Rules (Enforced on every PR)

### 1. Test Coverage
- **Hard-fail** any PR that adds or modifies business logic in `lib/briefing/`, `lib/taskflow/`, or `app/api/cron/` without accompanying tests.
- **Hard-fail** any PR that removes the `test`, `test:smoke`, or `lint` scripts from `package.json`.

### 2. Continuous Integration
- **Hard-fail** any PR that deletes, disables, or removes a job from `.github/workflows/ci.yml`.
- **Hard-fail** any PR that bypasses required CI checks via admin override without a documented PROJECT.md emergency note.

### 3. Idempotency (Critical — protects against double-sending the morning email)
- **Hard-fail** any PR that modifies `lib/briefing/idempotency.ts` or `app/api/cron/morning-brief/route.ts` without accompanying tests.
- **Hard-fail** any PR that removes the "fail-closed without idempotency backend" behavior in production.
- **Hard-fail** any PR that adds a new email-send code path that bypasses `beginBriefingSend()`.

### 4. Node Version Pinning
- **Hard-fail** any PR where `package.json` `engines.node`, `.nvmrc`, and `.github/workflows/ci.yml` `node-version-file` are not perfectly consistent.
- **Hard-fail** any PR that removes any of those three pin sites.

### 5. OpenAPI Client Generation
- **Hard-fail** any PR that manually edits `lib/taskflow/generated/client.ts` (or the future Blueprint equivalent) without updating the source OpenAPI spec (`openapi/*.json`) and running the generation script. The OpenAPI spec is the source of truth for the external contract.

### 6. Landing Page Surface Lock
- **Hard-fail** any PR that adds new pages under `app/` (other than the existing `app/page.tsx`, `app/layout.tsx`, and image generators), new interactive components under `app/components/`, signup forms, analytics scripts, or third-party tracking pixels, without an explicit PROJECT.md update authorizing the change.

## PR Sequencing (Current Work)

| PR | Scope | Status |
|---|---|---|
| **PR 1 (Install + Harness)** | PROJECT.md, LICENSE, AGENTS.md, CLAUDE.md, GitHub Actions CI (`lint`, `test`, `smoke`), Node pinning (`22.11.x`), `test:smoke` script, smoke test for the preview endpoint, README scrub for naming neutrality. | This PR |
| **PR 2 (Migration)** | Rename all `Taskflow` references to `Blueprint` (directories, env vars, OpenAPI spec, generated client, user-facing strings). Update OpenAPI spec to match Workflow Blueprint's v1 API contract. Regenerate client. Migrate consumer to use `EXTERNAL_API_KEY` and the new v1 endpoints. Coordinate with the corresponding deprecation work in the `workflow-blueprint` repo. | Planned |

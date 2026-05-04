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

Agentic Daily Briefing is a proprietary, single-purpose Next.js application that runs as a Vercel Cron job. It aggregates live research (via Google News RSS) and task state (via the Workflow Blueprint API), ranks the items for decision relevance, and sends a daily morning email briefing to the founder. It is designed for extreme reliability, idempotency, and graceful degradation.

## Non-goals

1. **Not a multi-user SaaS product** — The app is hardcoded to send to a specific list of recipients (`BRIEFING_TO_EMAILS`). There is no user management, no database of preferences, and no web UI beyond the API routes.
2. **Not a generic newsletter tool** — The research topics, ranking logic, and email formatting are highly specific to the founder's operational needs (Personal, Elevated Organics, Brightline Labs, etc.).
3. **Not a synchronous web app** — The app is invoked via cron. It does not serve HTML pages to browsers.
4. **Not a stateful application** — The app has no primary database. It uses Vercel KV / Upstash Redis exclusively for idempotency locks to prevent double-sends.

## Architecture & Stack

- **Framework:** Next.js 15.5.x App Router, React 19.
- **Runtime:** Node.js 22.11.x is declared via `engines.node` and pinned in `.nvmrc`.
- **Deployment:** Vercel (Serverless Functions) triggered by Vercel Cron.
- **Email:** Resend.
- **Idempotency:** Upstash Redis / Vercel KV REST API.
- **External API Consumption:** Consumes the Workflow Blueprint API via a generated client.

## Verifier Rules (Enforced on every PR)

### 1. Test Coverage & CI
- **Hard-fail** any PR that adds or modifies business logic in `lib/briefing/` or `app/api/cron/` without accompanying tests.
- **Hard-fail** any PR that removes the `test` or `test:smoke` scripts from `package.json`.
- **Hard-fail** any PR where the GitHub Actions CI workflow (`.github/workflows/ci.yml`) is deleted, disabled, or missing the `lint`, `test`, or `smoke` jobs.

### 2. Idempotency (Critical)
- **Hard-fail** any PR that modifies `lib/briefing/idempotency.ts` or `app/api/cron/morning-brief/route.ts` without accompanying tests.
- **Hard-fail** any PR that removes the "fail-closed without idempotency backend" behavior in production.
- **Hard-fail** any PR that bypasses `beginBriefingSend()` in any new send path. Double-sends are a critical failure mode.

### 3. Node Version Pinning
- **Hard-fail** any PR where `package.json` `engines.node`, `.nvmrc`, and `.github/workflows/ci.yml` `node-version-file` are not perfectly consistent.
- **Hard-fail** any PR that removes any of those three pin sites.

### 4. OpenAPI Client Generation
- **Hard-fail** any PR that manually edits `lib/taskflow/generated/client.ts` (or its future Blueprint equivalent) without updating the source OpenAPI spec (`openapi/*.json`) and running the generation script. The OpenAPI spec is the source of truth for the external contract.

## PR Sequencing (Current Work)

| PR | Scope | Status |
|---|---|---|
| **PR 1 (Install)** | PROJECT.md, LICENSE, AGENTS.md, CLAUDE.md. | Pending |
| **PR 2 (Harness)** | GitHub Actions CI (`lint`, `test`, `smoke`), Node pinning (`22.11.x`), Vitest smoke test for the preview endpoint. | Planned |
| **PR 3 (Migration)** | Rename all `Taskflow` references to `Blueprint` (directories, env vars, strings). Update OpenAPI spec to match Workflow Blueprint's v1 API. Regenerate client. Migrate consumer to use `EXTERNAL_API_KEY` and the new v1 endpoints. | Planned |

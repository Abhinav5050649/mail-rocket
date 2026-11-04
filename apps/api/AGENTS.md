# AGENTS.md - apps/api

Instructions for any AI coding agent other than Claude Code (Codex, Cursor, etc.) working in this directory. Claude Code reads [CLAUDE.md](CLAUDE.md) instead, which mirrors this file's structure with Claude-specific rules and Skill references layered on top.

## Overview

mail-rocket's backend: a single long-lived [Bun](https://bun.sh) process that serves HTTP with [Hono](https://hono.dev) and runs background jobs with [BullMQ](https://docs.bullmq.io) (Redis-backed) side by side, talking to a self-hosted Postgres via [Drizzle ORM](https://orm.drizzle.team). It's a self-hosted, single-organization email campaign API (SES sending identities, templates, recipient groups, campaigns). There are no users, passwords or tenants: every request authenticates with an API key whose CASL claims decide what it may do (see README's "Access: API keys").

**Do not re-derive architecture from scratch or duplicate it here.** The authoritative docs are:

- [README.md](README.md) - setup, commands, and the full "Architecture" section (API keys, layering, request lifecycle, domain model, background job pipelines, database, deployment).
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - the same flows as diagrams (system overview, request flow, auth, data model, identity verification, campaign send pipeline).
- [requirements.md](requirements.md) - AWS IAM permissions and trust relationships the SES integration needs.

Read both before any non-trivial change, and keep them updated if a change alters a flow they describe.

## Instructions

- **Never read or print the `.env` file's contents.** Use `example.env` as the reference for what variables exist.
- Follow the existing layering strictly: `routes -> controllers -> services -> models`, never skipped, never reached-around (see README's Architecture section and the `api-request-response-flow` skill).
- Match the logging pattern used by every controller/service method (the `api-logging` skill) - don't invent a different style.
- Schema changes go through Drizzle: edit `src/models/*.ts`, run `bun run db:generate`, commit the resulting migration under `drizzle/` - never hand-edit a migration file (the `api-data-model` skill).
- After any endpoint or schema change, update the repo-root `resources/dbml/mail-rocket.dbml` and `resources/openapi/mail-rocket-api.openapi.json` so they stay the source of truth alongside the code.
- Response shapes, permission claims, status enums and template variable names are shared with the web app through `@mail-rocket/shared` (`packages/shared`). When a response gains or loses a field, update the shared wire type: `src/contracts.ts` fails `bun run typecheck` until both sides agree.
- There is no linter configured yet - match the style of the file you're editing. Unit tests for controllers live under `tests/controllers` (mocked services, no DB/Redis/AWS needed - `bun run test`); tests for the AWS-SES-dependent send flows (`SendCampaignService`, `IdentityService`) live under `tests/services` (`bun run test:send-flows`), with `db`/`sesClient`/queue modules mocked via `mock.module`. Add a test alongside any new/changed controller or send-flow method. At minimum confirm `bun run dev` boots cleanly if you touched bootstrap/middleware/queues.
- Code should stay clean and simple; don't add abstractions, config, or error handling for cases that can't happen.

## Skills

Domain knowledge for this codebase is packaged as skills, not restated here - load the one matching what you're touching:

- `api-data-model` - `src/models/*`, Drizzle queries/migrations, schema conventions.
- `api-logging` - the logging pattern used in every controller/service method.
- `api-request-response-flow` - `src/routes`, `src/controllers`, `src/services`, the layering, error/pagination conventions.

Available under `.agents/skills/`, mirrored for Claude Code under `.claude/skills/`.

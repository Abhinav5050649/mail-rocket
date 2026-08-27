# CLAUDE.md - bun/api

Instructions for Claude Code working in this directory. Tool-agnostic instructions also live in [AGENTS.md](AGENTS.md) - this file mirrors its structure but adds Claude-specific rules and points at Claude Skills.

## Overview

mail-rocket's backend: a single long-lived [Bun](https://bun.sh) process that serves HTTP with [Hono](https://hono.dev) and runs background jobs with [BullMQ](https://docs.bullmq.io) (Redis-backed) side by side, talking to a self-hosted Postgres via [Drizzle ORM](https://orm.drizzle.team). It's a multi-tenant email campaign API - organizations manage SES sending identities, templates, recipient groups, and campaigns.

**Do not re-derive architecture from scratch or duplicate it here.** The authoritative docs are:

- [README.md](README.md) - setup, commands, and the full "Architecture" section (layering, request lifecycle, multi-tenancy, background job pipelines, database, deployment).
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - the same flows as diagrams (system overview, request flow, auth, data model, identity verification, campaign send pipeline).

Read both before any non-trivial change, and keep them updated if a change alters a flow they describe.

## Instructions

1) NEVER read .env files
2) Code should be clean, simple and easy to understand
3) Each and every line of code should be well-documented

Also:

- Follow the existing layering strictly: `routes -> controllers -> services -> models`, never skipped, never reached-around (see README's Architecture section and the `api-request-response-flow` skill).
- Match the logging pattern used by every controller/service method (the `api-logging` skill) - don't invent a different style.
- Schema changes go through Drizzle: edit `src/models/*.ts`, run `bun run db:generate`, commit the resulting migration under `drizzle/` - never hand-edit a migration file (the `api-data-model` skill).
- After any endpoint or schema change, update `resources/dbml/mail-rocket.dbml` and `resources/openapi/mail-rocket-api.openapi.json` so they stay the source of truth alongside the code.
- There is no test suite or linter configured yet - match the style of the file you're editing, and at minimum confirm `bun run dev` boots cleanly if you touched bootstrap/middleware/queues.

## Skills

Use the `Skill` tool to load the matching skill before editing that part of the codebase (defined under `.claude/skills/`, also mirrored tool-agnostically under `.agents/skills/` for non-Claude agents):

- `api-data-model` - `src/models/*`, Drizzle queries, migrations, schema conventions.
- `api-logging` - the pino Start/Request/Response/End pattern used in every controller and service method.
- `api-request-response-flow` - `src/routes`, `src/controllers`, `src/services`, the four-layer request flow, error/pagination conventions.
- `skill-creator` - only for authoring or editing Claude Skills themselves, not project code.

---
name: api-data-model
description: Use when adding or modifying a database table/column, writing a Drizzle query, or reasoning about how data is stored in the mail-rocket API (apps/api) - covers the self-hosted Postgres + Drizzle ORM setup, common schema conventions, enums, relations, the single organization row, API keys, indexes, and migrations. Trigger whenever creating/editing files under src/models, writing db.select/insert/update/delete, or touching resources/dbml or drizzle/.
---

# Data storage & model in apps/api

## Storage

- Postgres, self-hosted (local install for dev, a `postgres` container alongside `api` in the repo-root `docker-compose.yml` for production). Accessed via `drizzle-orm/node-postgres` in [src/libs/db.ts](../../../src/libs/db.ts) - a pooled `pg.Pool` TCP client.
  - Deliberate choice: the API runs as a long-lived process (via Docker), not per-invocation Lambda, so a pooled TCP client is the natural fit - the pool is created once and reused across every request instead of opening a connection per invocation.
  - `db = drizzle({ client: pool, schema })` where `schema` is the full barrel of `src/models`.
  - `connectDB()` runs `select 1` at boot and logs/throws - called once from the root `index.ts` before the server starts.

## Schema source of truth

- One file per entity in `src/models/*Model.ts`, each exporting a `pgTable(...)` and an inferred row type; all re-exported from `src/models/index.ts`.
- `drizzle.config.ts` points `drizzle-kit` at `src/models/*.ts` and writes generated migrations to `./drizzle` (numbered `.sql` files + `meta/*_snapshot.json` + `_journal.json`). Run `drizzle-kit generate` after schema changes to produce a migration - never hand-edit files under `drizzle/`.
- Two docs mirror the schema and should be updated alongside any table/column change: [resources/dbml/mail-rocket.dbml](../../../../../resources/dbml/mail-rocket.dbml) (repo root) (ER diagram source) and `resources/openapi/mail-rocket-api.openapi.json` (API contract).

## Universal column conventions

Every table in this project carries the same base columns - match this exactly for new tables:

```ts
id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
entity: varchar("entity").default("mail_rocket.<table_name>"),
created_at: timestamp("created_at").$defaultFn(() => new Date()),
updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
description: varchar("description"),
```

- `id` is an app-generated UUID **string** (`varchar`, not Postgres's native `uuid` type) - keep this consistent so FK columns (`varchar("x_id").references(...)`) match.
- `entity` is a domain-namespaced type tag (`"mail_rocket.<table>"`) - documentation/future-polymorphism, not currently used in query filters.
- `description` is a generic free-text metadata field present on nearly every table, not just user-facing ones.
- Column and table names are snake_case and match the TS property/table name 1:1 - there's no camelCase mapping layer.
- Each model exports `export type IX = typeof xTable.$inferSelect;` for the row type (e.g. `IApiKey`, `ICampaign`).

## Enums

```ts
export const xStatusEnum = pgEnum("x_status", ["draft", "active"]);
export type XStatus = (typeof xStatusEnum.enumValues)[number];
```
Examples: `identity_type` (domain/email), `identity_status` (created/pending/active), `campaign_status` (draft/scheduled/sending/sent/failed). Authorization is not an enum - it's a JSONB claim list on `api_key` (see below). Always pair the `pgEnum` with a derived TS union type like this - don't hand-write a separate union.

## Relations (no multi-tenancy)

- mail-rocket is self-hosted: one instance, one organization, no tenants and no users. **Don't add an `organization_id` to new tables** - nothing is scoped by organization.
- `organization` is a single row (the instance's profile), seeded by `bootstrap()` via `OrganizationService.ensureExists()` and read with `OrganizationService.get()`. Only `address` and `contact_details` reference it (the organization's own postal/contact details); their controllers resolve the id from the singleton rather than taking it from the request.
- `api_key` ([src/models/ApiKeyModel.ts](../../../src/models/ApiKeyModel.ts)) is the only principal: `name`, `claims` (JSONB CASL `{action, subject}` list, typed by `Claim` from `src/libs/abilities.ts`), unique `key_hash` (SHA-256 of the secret - the secret itself is never stored), `prefix`, `expires_at`. Nothing references it - resources don't record which key created them.
- Nesting follows the domain: `campaign` -> `group` -> `recipients`, each carrying its immediate parent's FK.
- FKs use plain `.references(() => otherTable.id)` by default. Only add `{ onDelete: "cascade" }` where a child row is meaningless without its parent.

## Indexes & constraints

- Add an explicit index on any FK column a service actually filters by:
  ```ts
  }, (table) => [
      index("<table>_<column>_idx").on(table.column),
  ]);
  ```
- A composite `unique(...)` constraint already indexes its leading column - don't add a redundant single-column index for that column.
- Use `.unique()`/`unique(...)` to enforce natural-key constraints (e.g. `api_key.key_hash`, which also makes authentication a single indexed lookup).

## Query conventions (in services)

- No repository/model methods - all reads/writes happen inline in `*Service` classes via `db.select()/insert()/update()/delete()`.
- Single-row lookups: `db.select().from(xTable).where(eq(xTable.id, id))`, destructure `const [row] = ...`.
- Lists: always paginated and ordered - `.orderBy(asc(xTable.id)).limit(options?.limit ?? DEFAULT_PAGE_SIZE).offset(options?.offset ?? 0)` (see `api-request-response-flow` skill for the pagination contract).
- Cross-entity reads use `.innerJoin`/`.leftJoin(otherTable, eq(a.fk, otherTable.id))` and select shaped objects - see `SendCampaignService.sendChunk` (`campaign_recipient` joined to `recipients` and `group`) as the reference pattern.
- Every query is wrapped in the try/catch + logging pattern from the `api-logging` skill.

## Adding a new table - checklist

1. Create `src/models/XModel.ts` with the universal columns above, any FKs/enums/indexes it needs.
2. Export it from `src/models/index.ts`.
3. Run `drizzle-kit generate` (via `npx`/`bunx drizzle-kit generate`) to produce the migration.
4. Add a `*Service` with CRUD + logging, and a `*Controller`/`*Route` per `api-request-response-flow`.
5. Add a subject for it to `SUBJECTS` (and the presets that should grant it) in `packages/shared/src/abilities.ts`, which both the API and the web app import. Add its wire type to `packages/shared/src/resources.ts` and a line to `src/contracts.ts`.
6. Update the repo-root `resources/dbml/mail-rocket.dbml` and the OpenAPI spec.

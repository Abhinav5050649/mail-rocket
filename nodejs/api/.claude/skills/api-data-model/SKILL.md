---
name: api-data-model
description: Use when adding or modifying a database table/column, writing a Drizzle query, or reasoning about how data is stored in the mail-rocket Node.js API (nodejs/api) - covers the Neon Postgres + Drizzle ORM setup, common schema conventions, enums, relations/multi-tenancy, indexes, and migrations. Trigger whenever creating/editing files under src/models, writing db.select/insert/update/delete, or touching resources/dbml or drizzle/.
---

# Data storage & model in nodejs/api

## Storage

- Postgres, hosted on Neon (serverless). Accessed via `drizzle-orm/neon-http` in [src/libs/db.ts](../../../src/libs/db.ts) - the HTTP driver (one fetch per query), not a pooled TCP client.
  - Deliberate choice: Lambda gives every invocation a fresh short-lived environment, so a pooled TCP client would open a new connection per cold start and risk exhausting Postgres's connection limit. The HTTP driver needs no pooling and avoids that entirely. Don't "fix" this by switching to `drizzle-orm/neon-serverless` or `postgres` without understanding this tradeoff.
  - `db = drizzle({ client, schema })` where `schema` is the full barrel of `src/models`.
  - `connectDB()` runs `select 1` at boot and logs/throws - called once from the root `index.ts` before the server starts.

## Schema source of truth

- One file per entity in `src/models/*Model.ts`, each exporting a `pgTable(...)` and an inferred row type; all re-exported from `src/models/index.ts`.
- `drizzle.config.ts` points `drizzle-kit` at `src/models/*.ts` and writes generated migrations to `./drizzle` (numbered `.sql` files + `meta/*_snapshot.json` + `_journal.json`). Run `drizzle-kit generate` after schema changes to produce a migration - never hand-edit files under `drizzle/`.
- Two docs mirror the schema and should be updated alongside any table/column change: [resources/dbml/mail-rocket.dbml](../../../resources/dbml/mail-rocket.dbml) (ER diagram source) and `resources/openapi/mail-rocket-api.openapi.json` (API contract).

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
- Each model exports `export type IX = typeof xTable.$inferSelect;` for the row type (e.g. `IUser`, `ICampaign`).

## Enums

```ts
export const xStatusEnum = pgEnum("x_status", ["draft", "active"]);
export type XStatus = (typeof xStatusEnum.enumValues)[number];
```
Examples: `organization_user_role` (viewer/editor/admin), `identity_type` (domain/email), `identity_status` (created/active), `campaign_status` (draft/active). Always pair the `pgEnum` with a derived TS union type like this - don't hand-write a separate union.

## Relations & multi-tenancy

- `organization` is the tenant root. Nearly every other table carries `organization_id: varchar(...).references(() => organizationTable.id)` scoping its rows to one org.
- `user` is the one exception: organization-independent, many-to-many with `organization` via the `organization_user` join table ([src/models/OrganizationUserModel.ts](../../../src/models/OrganizationUserModel.ts)). The membership's `role` enum lives on `organization_user`, not on `user`, because role is per-organization.
- Deeper nesting follows the domain: `campaign` -> `group` -> `recipients`, each carrying both its immediate parent's FK and `organization_id`.
- FKs use plain `.references(() => otherTable.id)` by default. Only add `{ onDelete: "cascade" }` where a child row is meaningless without its parent - currently just `organization_user.organization_id`/`user_id` (a membership can't outlive either side).

## Indexes & constraints

- Add an explicit index on any FK column a service actually filters by:
  ```ts
  }, (table) => [
      index("<table>_<column>_idx").on(table.column),
  ]);
  ```
- A composite `unique(...)` constraint already indexes its leading column - don't add a redundant single-column index for that column (see `organization_user`: the `(organization_id, user_id)` unique index also serves organization_id-only lookups; `user_id` gets its own index since it isn't the leading column).
- Use `unique(...)` to enforce natural-key constraints (e.g. one membership row per (organization, user) pair).

## Query conventions (in services)

- No repository/model methods - all reads/writes happen inline in `*Service` classes via `db.select()/insert()/update()/delete()`.
- Single-row lookups: `db.select().from(xTable).where(eq(xTable.id, id))`, destructure `const [row] = ...`.
- Lists: always paginated and ordered - `.orderBy(asc(xTable.id)).limit(options?.limit ?? DEFAULT_PAGE_SIZE).offset(options?.offset ?? 0)` (see `api-request-response-flow` skill for the pagination contract).
- Cross-entity reads use `.innerJoin(otherTable, eq(a.fk, otherTable.id))` and select shaped objects: `db.select({ user: userTable, membership: organizationUserTable })...` - returns `{ user, membership }[]`, which the controller then flattens for the response. See [src/services/OrganizationUserService.ts](../../../src/services/OrganizationUserService.ts) (`getUsersByOrganization` / `getOrganizationsByUser`) as the reference pattern.
- Every query is wrapped in the try/catch + logging pattern from the `api-logging` skill.

## Adding a new table - checklist

1. Create `src/models/XModel.ts` with the universal columns above, any FKs/enums/indexes it needs.
2. Export it from `src/models/index.ts`.
3. Run `drizzle-kit generate` (via `npx`/`bunx drizzle-kit generate`) to produce the migration.
4. Add a `*Service` with CRUD + logging, and a `*Controller`/`*Route` per `api-request-response-flow`.
5. Update `resources/dbml/mail-rocket.dbml` and the OpenAPI spec.

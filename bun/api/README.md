# server

To install dependencies:

```bash
bun install
```

To run in dev (watches for changes):

```bash
bun run dev
```

To build and run the production bundle:

```bash
bun run build
bun start
```

## Access: API keys

mail-rocket is self-hosted and has no users, passwords or tenants. Every request authenticates with an **API key** (`Authorization: Bearer mr_...` or `x-api-key: mr_...`), and the key is the only principal.

- **First boot:** if the database has no keys, `index.ts` mints an `admin` key and prints it to stdout once. It is not written to the logs and can't be recovered, so store it. The same check runs on every boot, so an instance whose last key was revoked mints a new one on the next restart.
- **CLI:** `bun run key:create --name ops --preset admin [--expires 2027-01-01]` mints a key without a restart.
- **API:** `POST /keys` with `{ "name": "...", "preset": "editor" }` or an explicit `claims` list. The secret appears once, in that response. `GET /me` returns the calling key.

What a key may do is decided by its **claims**: a list of CASL `{ action, subject }` grants (`src/libs/abilities.ts`) that every route checks via `requireAbility(action, subject)`. Actions are `read`/`create`/`update`/`delete`. Subjects are `Organization`, `Address`, `ContactDetails`, `Identity`, `Campaign`, `Template`, `Group`, `Recipient` and `Key`. Three presets expand to claim lists:

| Preset | Grants |
| --- | --- |
| `viewer` | `read` on every subject |
| `editor` | viewer + `create`/`update`/`delete` on `Campaign`, `Template`, `Group`, `Recipient` (identities stay read-only) |
| `admin` | editor + `update Organization`, and `create`/`update`/`delete` on `Identity`, `Address`, `ContactDetails`, `Key` |

A key stores the expanded list, not the preset name, so a custom combination is just a different list. A key can't change its own claims or revoke itself.

## MCP server

`/mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) endpoint (Streamable HTTP), so AI clients can run mail-rocket directly. It authenticates exactly like the REST API: point the client at `https://<host>/mcp` with an `Authorization: Bearer mr_...` header. For example, in Claude Code:

```bash
claude mcp add --transport http mail-rocket https://<host>/mcp --header "Authorization: Bearer mr_..."
```

- **Tools:** 46 tools, matching the REST API one-for-one. Every resource has `list_*`, `get_*`, `create_*`, `update_*` and `delete_*`, plus `get_organization`/`update_organization`, the key tools `list_keys`/`get_key`/`create_key`/`update_key`/`delete_key`, `get_me`, `get_overview` (the dashboard's counts), and `add_recipient_to_group`/`remove_recipient_from_group` (a recipient can be in several groups). They're defined in `src/mcp/tools.ts`.
- **Permissions:** each tool needs the same CASL claim as its REST route, and a key is only *shown* the tools it holds claims for. Give an agent its own key with the narrowest preset that works. A `viewer` key gets a read-only agent.
- **System-managed fields:** campaign `status`/`failure_reason` and identity `status`/`verification_records` can't be set over MCP or REST (REST returns 400). Scheduling is driven by `start_time` (`null` cancels), and identity status by SES verification. Deleting a campaign also cancels its pending send, keeps its templates, groups and recipients (unlinked) and removes its send history; a campaign that is mid-send can't be deleted. An identity's `type`/`identity` can't be changed after creation either; create a new identity instead.
- **Stateless:** each request gets a fresh server and a plain JSON response, with no sessions or SSE stream, so it scales like any other route.

## Architecture

The API is a single long-lived [Bun](https://bun.sh) process (not serverless): [Hono](https://hono.dev) serves HTTP via `Bun.serve`, [Drizzle ORM](https://orm.drizzle.team) talks to Postgres, and [BullMQ](https://docs.bullmq.io) (backed by Redis) runs background jobs in the same process as the HTTP server. `index.ts` wires all three up: it connects to the DB, starts the BullMQ workers, then starts the Hono server.

> See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for diagrams of these flows (request layering, auth, data model, and both background job pipelines).

> See [requirements.md](requirements.md) for the AWS IAM permissions and trust relationships the SES integration needs.

### Layers

Each resource (campaign, identity, template, ...) is implemented as a vertical slice through four layers, each with one job:

```
routes/        Hono route tables - wires an HTTP method + path to a middleware chain and a controller method.
controllers/   HTTP <-> domain translation - reads params/query/body off the Hono Context, calls a service, maps the result to a JSON response or an HTTPException.
services/      Business logic and data access - the only layer that imports Drizzle and issues queries. Knows nothing about Hono.
models/        Drizzle table schemas (source of truth for the DB shape) plus their inferred TS row types.
```

A request flows top-to-bottom through these layers and never skips one: `routes/CampaignRoute.ts` → `controllers/CampaignController.ts` → `services/CampaignService.ts` → `models/CampaignModel.ts`. Each layer directory has a barrel `index.ts` that re-exports everything in it, so callers import from `../services`, `../models`, etc. rather than reaching into individual files. Services are plain classes with no framework dependency, instantiated once per process and shared across requests (routes construct one `XService`/`XController` pair at module load and bind it into the route table - see the top of any `*Route.ts` file).

`libs/` holds the shared, stateless building blocks every layer above pulls from: the Drizzle `db` client and `connectDB()` (`db.ts`), the pino `logger` (`logger.ts`), the shared `redisConnection` for BullMQ (`redis.ts`), the SES `sesClient` (`ses.ts`), CASL claims, presets and ability construction (`abilities.ts`), API-key generation/hashing and the `/keys` request schemas (`apiKeys.ts`), the `ValidationError` class (`errors.ts`), pagination defaults (`pagination.ts`), and a small array-chunking helper (`chunk.ts`).

`src/mcp/` holds the MCP server: `tools.ts` defines every tool (schema, CASL claim, handler calling the services, like the queue workers do) and `server.ts` builds a per-key server exposing only the tools that key may use. `McpController` hands requests to the SDK's Streamable HTTP transport.

`src/bootstrap.ts` runs once at boot, after `connectDB()`. It seeds the single `organization` row and mints the first admin key (see "Access: API keys" above). `src/cli/createKey.ts` backs `bun run key:create`.

### Request lifecycle

`index.ts` registers global middleware on the root Hono app, then mounts the route table (`routes/AppRoute.ts`) at `/`:

1. `requestLogger` - logs method/path/duration for every request.
2. `jsonOnly` - rejects POST/PUT/PATCH requests that aren't `application/json` before any controller tries to parse a body.
3. Routing into `appRoute`, which applies `authenticate` to every route. There are no public routes. `authenticate` hashes the presented API key, finds it with one indexed lookup on `api_key.key_hash` (401 if it's missing, unknown or expired), re-validates its claims, and sets `principal` (key id, name, claims and CASL ability) on the context.
4. Per-route middleware - every route except `/me` and `/overview` applies `requireAbility(action, subject)`, which returns 403 unless the key's ability grants that action on that subject. `/overview` instead returns each of its sections only when the key can `read` that section's subject, and `null` otherwise.
5. The matched controller method runs, calls into a service, and returns JSON.

Anything thrown along the way - an `HTTPException` from a controller, a `ValidationError` from a service, or an unexpected error - is caught by the global `errorHandler` (`app.onError`, registered in `index.ts`) and turned into a consistent `{ error: string }` JSON response with an appropriate status code (500 for anything unrecognized, so internals never leak to the client).

### Domain model

One instance serves one organization, so there's no tenancy and resources live at the top level (`/campaigns`, `/templates`, ...; see `routes/AppRoute.ts`). `organization` is a single row: the profile of whoever runs the instance. It's seeded at boot, read and updated via `/organization`, and never created or deleted over the API. `address` and `contact_details` link to it as the organization's own postal/contact details. Nothing else carries an `organization_id`. `api_key` is the principal and has no relation to any other table.

`address` and `contact_details` hold sender info; `identity` represents a verified SES sending identity (an email address or a domain); `template` and `group`/`recipient` are campaign inputs; `campaign` ties them together and is what actually gets sent. Schema and relationships are defined in `src/models/*.ts` (Drizzle `pgTable`s with `.references()` foreign keys) - that's the up-to-date source of truth for columns, enums, and indexes.

### Background jobs (`src/queues/`)

Two independent BullMQ pipelines run as in-process workers, started once at boot from `index.ts` (`startCampaignWorkers`, `startIdentityVerificationWorker`):

- **Campaign send** (`CampaignQueues.ts`, `CampaignDispatch.ts`, `CampaignWorkers.ts`): creating/updating a campaign with a `start_time` schedules a `campaign-dispatch` job (via `scheduleCampaignDispatch`) using the campaign's own id as the BullMQ job id, so rescheduling replaces rather than duplicates it. When the job fires, the dispatch worker builds the recipient manifest and fans it out through a `FlowProducer` into many `campaign-send-chunk` jobs (rate-limited against SES, one SES `SendEmail` call per recipient) plus one `campaign-finalize` parent job that only runs once every chunk has settled and rolls the results up into the campaign's final `status`.
- **Identity verification** (`IdentityVerificationQueues.ts`, `IdentityVerificationScheduler.ts`, `IdentityVerificationWorker.ts`): creating an identity registers it with SES and schedules a poll job (identity's own id as the job id) that checks SES's verification status every `IDENTITY_VERIFY_POLL_INTERVAL_MS`, reschedules itself if still pending, and flips the identity to `active` once SES confirms it.

Queue-definition files (`*Queues.ts`) intentionally import no services, so both the scheduling side and the worker side can depend on them without an import cycle. Worker processors stay thin and delegate all DB/SES logic to services (`SendCampaignService`, `IdentityService`) - the same layering rule as the HTTP path, just triggered by a job instead of a request.

### Conventions worth knowing before adding code

- Every service method logs `info` at start/end and `debug` for its request/response payload, and wraps its query in `try { ... } catch { logger.error(...); throw; }` - follow this pattern for consistency (see `services/IdentityService.ts` for a representative example).
- Throw `ValidationError` (`libs/errors.ts`) from a service for an expected business-rule violation (→ 400); throw `HTTPException` from a controller for a request-shape problem (missing param, 404); let anything truly unexpected propagate to the global handler (→ 500).
- List endpoints accept `limit`/`offset` query params and default to `DEFAULT_PAGE_SIZE` (`libs/pagination.ts`) - background jobs that must see every row (e.g. `SendCampaignService.getRecipientIdsForCampaign`) deliberately skip pagination instead.

## Database

Schema is defined with [Drizzle ORM](https://orm.drizzle.team) in `src/models/*.ts`. SQL migration files are generated from that schema into `drizzle/` - commit them, don't hand-edit.

```bash
bun run db:generate  # after changing a schema file, generate a new migration
bun run db:migrate   # apply pending migrations to DB_URL
bun run db:studio    # browse data in Drizzle Studio
```

## Deployment (Docker on EC2)

The API runs as a plain long-lived Bun process, packaged as a Docker image (`oven/bun` base) - no serverless infra involved. Postgres is self-hosted too: `docker-compose.yml` runs it as its own `postgres` container (official `postgres:18-alpine` image, data persisted in a named volume), started alongside `api`.

```bash
docker compose up --build -d   # build the image, start the postgres + api containers
docker compose logs -f api     # follow logs
docker compose down            # stop both (add -v to also wipe the postgres volume)
```

See [requirements.md](requirements.md) before provisioning AWS credentials for the instance - it lists the IAM permissions the SES integration needs and the trust relationships involved (including the EC2 instance-role alternative to static keys).

`docker-compose.yml` reads secrets from a `.env` file (see `example.env`) via `env_file` - it is not committed and must exist on the EC2 instance before starting the containers. The `postgres` container is configured from the `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` vars in that same `.env`; the `api` service's `DB_URL` is derived from those same vars to point at the `postgres` container over the Docker network (overriding whatever `DB_URL` is set to for local dev).

Migrations aren't run automatically. The `postgres` container publishes its port to `127.0.0.1:5432` on the host only (not public), so after the containers are up, run `bun run db:migrate` directly on the EC2 instance with `DB_URL=postgres://<user>:<password>@localhost:5432/<db>` (matching the `POSTGRES_*` values in `.env`).

To deploy a change: SSH into the instance, `git pull`, then `docker compose up --build -d` again.

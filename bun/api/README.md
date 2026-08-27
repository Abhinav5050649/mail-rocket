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

## Architecture

The API is a single long-lived [Bun](https://bun.sh) process (not serverless): [Hono](https://hono.dev) serves HTTP via `Bun.serve`, [Drizzle ORM](https://orm.drizzle.team) talks to Postgres, and [BullMQ](https://docs.bullmq.io) (backed by Redis) runs background jobs in the same process as the HTTP server. `index.ts` wires all three up: it connects to the DB, starts the BullMQ workers, then starts the Hono server.

> See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for diagrams of these flows (request layering, auth, data model, and both background job pipelines).

### Layers

Each resource (campaign, identity, template, ...) is implemented as a vertical slice through four layers, each with one job:

```
routes/        Hono route tables - wires an HTTP method + path to a middleware chain and a controller method.
controllers/   HTTP <-> domain translation - reads params/query/body off the Hono Context, calls a service, maps the result to a JSON response or an HTTPException.
services/      Business logic and data access - the only layer that imports Drizzle and issues queries. Knows nothing about Hono.
models/        Drizzle table schemas (source of truth for the DB shape) plus their inferred TS row types.
```

A request flows top-to-bottom through these layers and never skips one: `routes/CampaignRoute.ts` → `controllers/CampaignController.ts` → `services/CampaignService.ts` → `models/CampaignModel.ts`. Each layer directory has a barrel `index.ts` that re-exports everything in it, so callers import from `../services`, `../models`, etc. rather than reaching into individual files. Services are plain classes with no framework dependency, instantiated once per process and shared across requests (routes construct one `XService`/`XController` pair at module load and bind it into the route table - see the top of any `*Route.ts` file).

`libs/` holds the shared, stateless building blocks every layer above pulls from: the Drizzle `db` client and `connectDB()` (`db.ts`), the pino `logger` (`logger.ts`), the shared `redisConnection` for BullMQ (`redis.ts`), the SES `sesClient` (`ses.ts`), JWT signing/verification (`jwt.ts`), password hashing via `Bun.password` (`password.ts`), the `ValidationError` class (`errors.ts`), pagination defaults (`pagination.ts`), and a small array-chunking helper (`chunk.ts`).

### Request lifecycle

`index.ts` registers global middleware on the root Hono app, then mounts the route table (`routes/AppRoute.ts`) at `/`:

1. `requestLogger` - logs method/path/duration for every request.
2. `jsonOnly` - rejects POST/PUT/PATCH requests that aren't `application/json` before any controller tries to parse a body.
3. Routing into `appRoute`, which splits into two Hono sub-apps mounted at `/`:
   - `publicRoute` - just `/auth` (signup/signin - the only way to get a token).
   - `protectedRoute` - everything else, gated by `authenticate` (verifies the `Authorization: Bearer <jwt>` header and sets `userId` on the context) applied to the whole sub-app before any of its routes are added.
4. Per-route middleware - most protected routes additionally apply `requireRole(minRole)` (checks the caller's `organization_user.role` for the `:organization_id` in the path meets a minimum of `viewer`/`editor`/`admin`) or `requireSelf` (restricts `/users/:id` self-service endpoints to the caller's own id).
5. The matched controller method runs, calls into a service, and returns JSON.

Anything thrown along the way - an `HTTPException` from a controller, a `ValidationError` from a service, or an unexpected error - is caught by the global `errorHandler` (`app.onError`, registered in `index.ts`) and turned into a consistent `{ error: string }` JSON response with an appropriate status code (500 for anything unrecognized, so internals never leak to the client).

### Domain model & multi-tenancy

Nearly every table is scoped to an `organization`, and the route table nests resources under `/organizations/:organization_id/...` accordingly (see `routes/AppRoute.ts`). `user` is the one exception: a user can belong to many organizations, so membership - and the `viewer`/`editor`/`admin` role it carries - lives on the `organization_user` join table rather than on `user` or `organization` directly. That's what `requireRole` checks on every write/read to a nested resource.

Within an organization: `address` and `contact_details` hold sender info; `identity` represents a verified SES sending identity (an email address or a domain); `template` and `group`/`recipient` are campaign inputs; `campaign` ties them together and is what actually gets sent. Schema and relationships are defined in `src/models/*.ts` (Drizzle `pgTable`s with `.references()` foreign keys) - that's the up-to-date source of truth for columns, enums, and indexes.

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

`docker-compose.yml` reads secrets from a `.env` file (see `example.env`) via `env_file` - it is not committed and must exist on the EC2 instance before starting the containers. The `postgres` container is configured from the `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` vars in that same `.env`; the `api` service's `DB_URL` is derived from those same vars to point at the `postgres` container over the Docker network (overriding whatever `DB_URL` is set to for local dev).

Migrations aren't run automatically. The `postgres` container publishes its port to `127.0.0.1:5432` on the host only (not public), so after the containers are up, run `bun run db:migrate` directly on the EC2 instance with `DB_URL=postgres://<user>:<password>@localhost:5432/<db>` (matching the `POSTGRES_*` values in `.env`).

To deploy a change: SSH into the instance, `git pull`, then `docker compose up --build -d` again.

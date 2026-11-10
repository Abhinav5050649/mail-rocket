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

What a key may do is decided by its **claims**: a list of CASL `{ action, subject }` grants (`src/libs/abilities.ts`) that every route checks via `requireAbility(action, subject)`. Actions are `read`/`create`/`update`/`delete`. Subjects are `Organization`, `Address`, `ContactDetails`, `Identity`, `Campaign`, `Template`, `Group`, `Subscriber` and `Key`. Three presets expand to claim lists:

| Preset | Grants |
| --- | --- |
| `viewer` | `read` on every subject |
| `editor` | viewer + `create`/`update`/`delete` on `Campaign`, `Template`, `Group`, `Subscriber` (identities stay read-only) |
| `admin` | editor + `update Organization`, and `create`/`update`/`delete` on `Identity`, `Address`, `ContactDetails`, `Key` |

A key stores the expanded list, not the preset name, so a custom combination is just a different list. A key can't change its own claims or revoke itself.

**System-managed fields:** campaign `status`/`failure_reason` and identity `status`/`verification_records` can't be set through the API (it returns 400). Scheduling is driven by `start_time` (`null` cancels), and identity status by SES verification. Deleting a campaign also cancels its pending send, keeps its template, groups and subscribers in their libraries and removes its send history; a campaign that is mid-send can't be deleted. A campaign's `template_id`, `group_ids` and `subscriber_ids` can't change once its send has started, and a template or group can't be deleted while a scheduled or sending campaign uses it. An identity's `type`/`identity` can't be changed after creation either; create a new identity instead.

## Open and click tracking

Set `PUBLIC_API_URL` (this API's public base URL) and `TRACKING_SECRET` to track opens and clicks. With them set, `SendCampaignService.sendChunk` passes each subscriber's rendered body through `addTracking` (`src/libs/tracking.ts`):

- **Opens:** a 1x1 pixel at `GET /track/open/:delivery_id` goes before `</body>`. Loading it sets `campaign_delivery.opened_at`.
- **Clicks:** every absolute `http(s)` link is rewritten to `GET /track/click/:delivery_id?url=...&sig=...`, which sets `clicked_at` (and `opened_at`, since a click implies an open), then redirects with a 302. `sig` is an HMAC of the id and URL, so the endpoint only redirects to links an email actually contained and can't be used as an open redirect.
- Only the first open and the first click are kept, so each subscriber counts once. `/track` is public: mail clients have no API key.
- `GET /campaigns/:campaign_id/stats` returns `total`/`pending`/`sent`/`failed`, `opened`/`clicked`/`unsubscribed`, and `open_rate`/`click_rate` (fractions of `sent`).

The tracking is ours, not SES's, so it keeps working if sending moves to another provider or plain SMTP. Bounces and complaints, by contrast, are provider-specific. A provider webhook (e.g. SES → SNS) could record them as more timestamp columns on `campaign_delivery` alongside `opened_at`/`clicked_at`.

With the variables unset, emails go out untouched and stats show only the send counts.

## Unsubscribe

With `PUBLIC_API_URL` set, every sent email also lets the subscriber unsubscribe (`src/libs/unsubscribe.ts`), as marketing-email law and the Gmail/Yahoo bulk-sender rules require:

- **Footer link:** "Don't want these emails? Unsubscribe" goes at the bottom of the body, pointing at `/unsubscribe/:delivery_id`. It's added after click tracking, so it's never routed through `/track/click`.
- **One-click headers (RFC 8058):** `List-Unsubscribe: <…/unsubscribe/:delivery_id>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, so mail clients show their own Unsubscribe button. Custom headers need the SES **v2** `SendEmail` (`sesV2Client`), which uses the same `ses:SendEmail` IAM action as v1.
- **`GET /unsubscribe/:delivery_id`** only shows a confirmation page with an Unsubscribe button. Link scanners that prefetch every link in an email therefore can't unsubscribe anyone.
- **`POST /unsubscribe/:delivery_id`** unsubscribes. It's posted by that button or by a mail client's one-click unsubscribe, with a form body, so `jsonOnly` exempts `/unsubscribe/`. It sets `subscribers.unsubscribed_at` and `campaign_delivery.unsubscribed_at` (for the per-campaign count), keeping the first time.
- An unsubscribe is **global**: dispatch leaves every unsubscribed subscriber out of every campaign's send (`getSubscriberIdsForCampaign`). They stay in their groups and lists, marked "Unsubscribed". `unsubscribed_at` is read-only through the API (400), so only the subscriber can opt out, and nobody can opt them back in.
- `/unsubscribe` is public, and the delivery id (a random UUID that only appears in that one person's email) is the only credential, the same as the open pixel.

Without `PUBLIC_API_URL` there is nowhere public to link to, so emails go out without an unsubscribe link. Only do that for local testing.

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

`libs/` holds the shared, stateless building blocks every layer above pulls from: the Drizzle `db` client, `connectDB()` and `runMigrations()` (`db.ts`), the pino `logger` (`logger.ts`), the shared `redisConnection` for BullMQ (`redis.ts`), the SES `sesClient` (`ses.ts`), CASL claims, presets and ability construction (`abilities.ts`), API-key generation/hashing and the `/keys` request schemas (`apiKeys.ts`), the `ValidationError` class (`errors.ts`), pagination defaults (`pagination.ts`), and a small array-chunking helper (`chunk.ts`).

`src/bootstrap.ts` runs once at boot, after `connectDB()` and `runMigrations()`. It seeds the single `organization` row and mints the first admin key (see "Access: API keys" above). `src/cli/createKey.ts` backs `bun run key:create`.

### Request lifecycle

`index.ts` registers global middleware on the root Hono app, then mounts the route table (`routes/AppRoute.ts`) at `/`:

1. `requestLogger` - logs method/path/duration for every request.
2. `jsonOnly` - rejects POST/PUT/PATCH requests that aren't `application/json` before any controller tries to parse a body.
3. Routing into `appRoute`, which applies `authenticate` to every route except the public `/track` open/click endpoints (mounted ahead of it). `authenticate` hashes the presented API key, finds it with one indexed lookup on `api_key.key_hash` (401 if it's missing, unknown or expired), re-validates its claims, and sets `principal` (key id, name, claims and CASL ability) on the context.
4. Per-route middleware - every route except `/me` and `/overview` applies `requireAbility(action, subject)`, which returns 403 unless the key's ability grants that action on that subject. `/overview` instead returns each of its sections only when the key can `read` that section's subject, and `null` otherwise.
5. The matched controller method runs, calls into a service, and returns JSON.

Anything thrown along the way - an `HTTPException` from a controller, a `ValidationError` from a service, or an unexpected error - is caught by the global `errorHandler` (`app.onError`, registered in `index.ts`) and turned into a consistent `{ error: string }` JSON response with an appropriate status code (500 for anything unrecognized, so internals never leak to the client).

### Domain model

One instance serves one organization, so there's no tenancy and resources live at the top level (`/campaigns`, `/templates`, ...; see `routes/AppRoute.ts`). `organization` is a single row: the profile of whoever runs the instance. It's seeded at boot, read and updated via `/organization`, and never created or deleted over the API. `address` and `contact_details` link to it as the organization's own postal/contact details. Nothing else carries an `organization_id`. `api_key` is the principal and has no relation to any other table.

`address` and `contact_details` hold sender info; `identity` represents a verified SES sending identity (an email address or a domain); `template`, `group` and `subscriber` are shared libraries; `campaign` ties them together and is what actually gets sent. A campaign picks one template (`campaign.template_id`) and its audience: any number of groups (`campaign_group`) plus any number of individually picked subscribers (`campaign_subscriber`), all set in the campaign's own create/update request (`template_id`, `group_ids`, `subscriber_ids`). The same template, group or subscriber can be used by any number of campaigns at once. Schema and relationships are defined in `src/models/*.ts` (Drizzle `pgTable`s with `.references()` foreign keys) - that's the up-to-date source of truth for columns, enums, and indexes.

### Background jobs (`src/queues/`)

Two independent BullMQ pipelines run as in-process workers, started once at boot from `index.ts` (`startCampaignWorkers`, `startIdentityVerificationWorker`):

- **Campaign send** (`CampaignQueues.ts`, `CampaignDispatch.ts`, `CampaignWorkers.ts`): creating/updating a campaign with a `start_time` schedules a `campaign-dispatch` job (via `scheduleCampaignDispatch`) using the campaign's own id as the BullMQ job id, so rescheduling replaces rather than duplicates it. When the job fires, the dispatch worker builds the subscriber manifest and fans it out through a `FlowProducer` into many `campaign-send-chunk` jobs (rate-limited against SES, one SES `SendEmail` call per subscriber) plus one `campaign-finalize` parent job that only runs once every chunk has settled and rolls the results up into the campaign's final `status`.
- **Identity verification** (`IdentityVerificationQueues.ts`, `IdentityVerificationScheduler.ts`, `IdentityVerificationWorker.ts`): creating an identity registers it with SES and schedules a poll job (identity's own id as the job id) that checks SES's verification status every `IDENTITY_VERIFY_POLL_INTERVAL_MS`, reschedules itself if still pending, and flips the identity to `active` once SES confirms it.

Queue-definition files (`*Queues.ts`) intentionally import no services, so both the scheduling side and the worker side can depend on them without an import cycle. Worker processors stay thin and delegate all DB/SES logic to services (`SendCampaignService`, `IdentityService`) - the same layering rule as the HTTP path, just triggered by a job instead of a request.

### Conventions worth knowing before adding code

- Every service method logs `info` at start/end and `debug` for its request/response payload, and wraps its query in `try { ... } catch { logger.error(...); throw; }` - follow this pattern for consistency (see `services/IdentityService.ts` for a representative example).
- Throw `ValidationError` (`libs/errors.ts`) from a service for an expected business-rule violation (→ 400); throw `HTTPException` from a controller for a request-shape problem (missing param, 404); let anything truly unexpected propagate to the global handler (→ 500).
- List endpoints accept `limit`/`offset` query params and default to `DEFAULT_PAGE_SIZE` (`libs/pagination.ts`) - background jobs that must see every row (e.g. `SendCampaignService.getSubscriberIdsForCampaign`) deliberately skip pagination instead.

## Database

Schema is defined with [Drizzle ORM](https://orm.drizzle.team) in `src/models/*.ts`. SQL migration files are generated from that schema into `drizzle/` - commit them, don't hand-edit.

```bash
bun run db:generate  # after changing a schema file, generate a new migration
bun run db:migrate   # apply pending migrations to DB_URL by hand (the API also does this itself at startup)
bun run db:studio    # browse data in Drizzle Studio
```

## Deployment (Docker on EC2)

The API runs as a plain long-lived Bun process, packaged as a Docker image (`oven/bun` base) - no serverless infra involved. Postgres is self-hosted too: the repo-root `docker-compose.yml` runs it as its own `postgres` container (official `postgres:18-alpine` image, data persisted in a named volume), alongside `redis`, `api`, the `web` app and `caddy`. Run compose from the repo root and pass this app's env file, so the `POSTGRES_*` and domain values are read from it:

The `api` and `web` services name their published images, `abhinav2911/mail-rocket-api` and `abhinav2911/mail-rocket-web` (tag from `MAIL_ROCKET_VERSION`, default `latest`), so a server pulls them and needs no checkout. `--build` builds them from source instead.

```bash
docker compose --env-file apps/api/.env pull            # fetch the published images
docker compose --env-file apps/api/.env up -d           # start postgres, redis, api, web, caddy
docker compose --env-file apps/api/.env up --build -d   # or: build from this checkout (`bun run stack` at the root)
docker compose logs -f api                               # follow logs
docker compose down                                      # stop everything (add -v to also wipe the postgres volume)
```

See [requirements.md](requirements.md) before provisioning AWS credentials for the instance - it lists the IAM permissions the SES integration needs and the trust relationships involved (including the EC2 instance-role alternative to static keys).

The repo-root `docker-compose.yml` reads secrets from this app's `.env` file (`apps/api/.env`, see `example.env`) via `env_file` - it is not committed and must exist on the EC2 instance before starting the containers. The `postgres` container is configured from the `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` vars in that same `.env`; the `api` service's `DB_URL` is derived from those same vars to point at the `postgres` container over the Docker network (overriding whatever `DB_URL` is set to for local dev).

Migrations run automatically: on every start the API applies any files under `drizzle/` the database hasn't had yet (`runMigrations` in `src/libs/db.ts`), before `bootstrap()`. The image ships the `drizzle/` folder for this. Progress is tracked in the same `drizzle.__drizzle_migrations` table `drizzle-kit migrate` uses, so `bun run db:migrate` still works by hand and the two never re-apply each other's work.

To release: push a `vX.Y.Z` tag; `.github/workflows/publish-images.yml` builds both images for amd64 and arm64 and pushes `X.Y.Z`, `X.Y` and `latest` to Docker Hub. To deploy it: SSH into the instance, set `MAIL_ROCKET_VERSION` in `.env` (or leave it on `latest`), then `pull` and `up -d` as above.

### HTTPS (caddy)

`caddy` (repo-root `Caddyfile`) is the only service the internet reaches. It serves the web app at `APP_DOMAIN` and this API at `API_DOMAIN`, and gets and renews their TLS certificates from Let's Encrypt automatically. `api` and `web` publish their ports to `127.0.0.1` only. HTTPS isn't optional: in production the web app's session cookie is `secure`, so signing in over plain HTTP silently fails. Email clients also want HTTPS for the tracking and unsubscribe links. To set it up:

1. Point DNS A records for both domains at the instance (use an Elastic IP so the address survives a restart).
2. Open ports 80 and 443 in the security group (80 is needed for the certificate challenge and redirects to 443). Keep 22 limited to your IP, and don't open 3000, 3001 or 5432.
3. In `.env`, set `APP_DOMAIN`, `API_DOMAIN` and `PUBLIC_API_URL=https://<API_DOMAIN>`, plus a `TRACKING_SECRET`.
4. Start the stack. Caddy requests the certificates on first start (`docker compose logs -f caddy` to watch). They're kept in the `caddydata` volume.

Sign in at `https://<APP_DOMAIN>` with the admin key printed on first boot (`docker compose logs api`).

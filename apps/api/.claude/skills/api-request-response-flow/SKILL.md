---
name: api-request-response-flow
description: Use when adding a new endpoint, tracing how a request moves through the mail-rocket API (apps/api), or wiring a route - covers the Hono app bootstrap, the Route -> Controller -> Service -> Model layering, HTTPException error conventions, and limit/offset pagination. Trigger whenever creating/modifying files under src/routes, src/controllers, or src/services.
---

# Request/response flow in apps/api

## Bootstrap (entry point)

[index.ts](../../../index.ts) (repo root, not `src/index.ts`):

1. `await connectDB()` - fails fast on boot if Postgres is unreachable; then `await bootstrap()` (`src/bootstrap.ts`) seeds the single organization row and, if there are no API keys, mints an admin key and prints it to stdout.
2. `new Hono()`, then `app.use('*', requestLogger)`, `app.onError(errorHandler)`, `app.route('/', appRoute)`.
3. Starts the Hono app with `Bun.serve()` unconditionally - the process is a single long-lived server (run directly for local dev, or built with `bun run build` and run in Docker on EC2 for deployment; see the repo README's Deployment section). No Lambda/dual-runtime branching.

`src/index.ts` is just the barrel (`export * from "./controllers" | "./libs" | "./middleware" | "./models" | "./routes" | "./services"`), not app logic.

## The four layers

```
Route            Controller                  Service                    Model
(Hono router) -> (HTTP <-> domain glue)   -> (business logic + db)   -> (drizzle pgTable schema)
```

- **Route** (`src/routes/*Route.ts`): thin. Instantiates its service(s) and controller once at module scope, then wires HTTP verb + path to a `requireAbility(action, subject)` guard and a bound controller method. No logic here.
  ```ts
  const campaignService = new CampaignService();
  const campaignController = new CampaignController(campaignService);
  export const campaignRoute = new Hono()
      .get('/', requireAbility('read', 'Campaign'), campaignController.getAll)
      .post('/', requireAbility('create', 'Campaign'), campaignController.post)
      ...
  ```
  This module-scope singleton is safe because controller methods are arrow-function class properties (bound `this`), reused across every request in the process.

- **Controller** (`src/controllers/*Controller.ts`): translates a Hono `Context` into a service call and back.
  - Pull params/query/body off `c.req`.
  - Validate required route params immediately: `if (!id) throw new HTTPException(400, { message: "Missing Parameters: id" })`.
  - Call the service; if it returns `null`, `throw new HTTPException(404, { message: "<Entity> not found" })`.
  - Return `c.json(result)` (200) or `c.json(result, 201)` for creates.
  - Never touch `db`/drizzle directly from a controller - always go through a service.
  - Follow the logging pattern in the `api-logging` skill for every method.

- **Service** (`src/services/*Service.ts`): all business logic and drizzle queries live here. Returns the entity (or `null` on not-found, or throws on unexpected DB error) - never touches `Context`, never throws `HTTPException` (that's an HTTP-layer concept). See `api-data-model` skill for query conventions.

- **Model** (`src/models/*Model.ts`): pure drizzle schema (`pgTable`) + inferred TS type. No logic, no queries.

Reference chain for a full example: [src/routes/CampaignRoute.ts](../../../src/routes/CampaignRoute.ts) -> [src/controllers/CampaignController.ts](../../../src/controllers/CampaignController.ts) -> [src/services/CampaignService.ts](../../../src/services/CampaignService.ts) -> [src/models/CampaignModel.ts](../../../src/models/CampaignModel.ts).

## Route nesting / mounting

All sub-routers are mounted once in [src/routes/AppRoute.ts](../../../src/routes/AppRoute.ts), which the root `index.ts` mounts at `/`. `appRoute.use('*', authenticate)` puts every route behind an API key - there are no public routes.

- There's no tenancy, so resources live at the top level: `/campaigns`, `/templates`, `/identities`, ...
- `/organization` (singular) is the single organization profile: `GET`/`PATCH` only.
- `/keys` manages API keys; `/me` returns the calling key (no `requireAbility` - any valid key may read itself).
- `/mcp` is the MCP endpoint (`McpRoute` -> `McpController` -> `src/mcp/`). Its tools call services directly, the same way queue workers do, and each tool declares its own CASL claim instead of using `requireAbility`. **When you add or change a REST operation, add or change the matching tool in `src/mcp/tools.ts`**, because the two are kept at parity.
- Campaign children nest one level deeper: `/campaigns/:campaign_id/groups` and `.../recipients`, plus a further `/groups/:group_id/recipients`.

When adding a new resource, mount it here rather than inventing a separate app-level route table.

## Authorization

- `authenticate` (`src/middleware/authenticate.ts`) sets `c.get('principal')`: `{ keyId, name, claims, ability }`, where `ability` is the CASL ability built from the key's claims.
- Every route guards itself with `requireAbility(action, subject)` (`src/middleware/authorize.ts`): `read` for GETs, `create`/`update`/`delete` for writes, on the resource's subject from `SUBJECTS` in `src/libs/abilities.ts`. It returns 403 when the claim is missing.
- Finer-grained rules a claim can't express live in the controller - e.g. `ApiKeyController` refuses to let a key change its own claims or revoke itself (403), and returns a summary shape from `GET /keys` unless the caller can `create Key`.
- 401 = no/unknown/expired key; 403 = authenticated but not allowed.

## Error conventions

- Only throw `HTTPException` from **controllers** (and the auth middleware), for conditions the caller can act on: `400` missing/invalid input, `401` bad key, `403` not allowed, `404` not found. Use `{ message: "..." }` - the message is what reaches the client verbatim.
- Anything else that throws (DB errors, bugs) is caught by the global `errorHandler` and turned into a generic `500` - don't pre-empt this with your own try/catch in a controller.
- Services signal "not found" by returning `null`, not by throwing - the controller is what decides that's a 404.

## Pagination

[src/libs/pagination.ts](../../../src/libs/pagination.ts) defines the convention every list endpoint follows:

- Query params `limit` and `offset` (plain SQL semantics, not cursor-based).
- Controller parses them with `Number(...)` if present, passes `{ limit, offset }` (both possibly `undefined`) to the service.
- Service defaults via `options?.limit ?? DEFAULT_PAGE_SIZE` (10) and `options?.offset ?? 0`, and orders by `id` ascending for stable results: `.orderBy(asc(table.id)).limit(...).offset(...)`.

## Adding a new endpoint - checklist

1. New entity? Add a `pgTable` in `src/models/` (see `api-data-model` skill) and export it from `src/models/index.ts`.
2. Add/extend a `*Service` with the CRUD method(s), following `api-logging`'s pattern.
3. Add/extend the matching `*Controller` method: validate params, call the service, map `null` -> 404, return `c.json`.
4. Wire the HTTP verb + path in the resource's `*Route.ts`.
5. Guard each route with `requireAbility(action, subject)`; for a new resource add its subject to `src/libs/abilities.ts` (and the presets).
6. Mount new top-level routes in `src/routes/AppRoute.ts`.
7. Update the repo-root `resources/dbml/mail-rocket.dbml` and `resources/openapi/mail-rocket-api.openapi.json` if the shape changed.

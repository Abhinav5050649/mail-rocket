---
name: api-request-response-flow
description: Use when adding a new endpoint, tracing how a request moves through the mail-rocket Node.js API (nodejs/api), or wiring a route - covers the Hono app bootstrap, the Route -> Controller -> Service -> Model layering, HTTPException error conventions, and limit/offset pagination. Trigger whenever creating/modifying files under src/routes, src/controllers, or src/services.
---

# Request/response flow in nodejs/api

## Bootstrap (entry point)

[index.ts](../../../index.ts) (repo root, not `src/index.ts`):

1. `await connectDB()` - fails fast on boot if Postgres is unreachable.
2. `new Hono()`, then `app.use('*', requestLogger)`, `app.onError(errorHandler)`, `app.route('/', appRoute)`.
3. Starts `@hono/node-server`'s `serve()` unconditionally - the process is a single long-lived server (run directly for local dev, or built with `npm run build` and run in Docker on EC2 for deployment; see the repo README's Deployment section). No Lambda/dual-runtime branching.

`src/index.ts` is just the barrel (`export * from "./controllers" | "./libs" | "./middleware" | "./models" | "./routes" | "./services"`), not app logic.

## The four layers

```
Route            Controller                  Service                    Model
(Hono router) -> (HTTP <-> domain glue)   -> (business logic + db)   -> (drizzle pgTable schema)
```

- **Route** (`src/routes/*Route.ts`): thin. Instantiates its service(s) and controller once at module scope, then wires HTTP verb + path to bound controller methods. No logic here.
  ```ts
  const userService = new UserService();
  const userController = new UserController(userService);
  export const userRoute = new Hono()
      .post('/', userController.post)
      .get('/:id', userController.get)
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

Reference chain for a full example: [src/routes/UserRoute.ts](../../../src/routes/UserRoute.ts) -> [src/controllers/UserController.ts](../../../src/controllers/UserController.ts) -> [src/services/UserService.ts](../../../src/services/UserService.ts) -> [src/models/UserModel.ts](../../../src/models/UserModel.ts).

## Route nesting / mounting

All sub-routers are mounted once in [src/routes/AppRoute.ts](../../../src/routes/AppRoute.ts), which the root `index.ts` mounts at `/`. Nesting mirrors the data model's tenancy:

- Most resources are scoped under `/organizations/:organization_id/...` because every table (except `user`) carries `organization_id`.
- `user` itself is standalone at `/users` (identity is organization-independent) - membership is managed separately at `/organizations/:organization_id/users` (`OrganizationUserRoute`), which manipulates `organization_user` join rows, not `user` rows.
- Campaign children nest one level deeper: `/organizations/:organization_id/campaigns/:campaign_id/groups` and `.../recipients`, plus a further `/groups/:group_id/recipients`.

When adding a new resource, mount it here rather than inventing a separate app-level route table.

## Error conventions

- Only throw `HTTPException` from **controllers**, for conditions the caller can act on: `400` missing/invalid input, `404` not found. Use `{ message: "..." }` - the message is what reaches the client verbatim.
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
5. Mount new top-level routes in `src/routes/AppRoute.ts`.
6. Update `resources/dbml/mail-rocket.dbml` and `resources/openapi/mail-rocket-api.openapi.json` if the shape changed.

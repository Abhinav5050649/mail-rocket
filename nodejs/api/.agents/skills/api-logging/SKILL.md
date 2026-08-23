---
name: api-logging
description: Use when writing, reviewing, or debugging logging in the mail-rocket Node.js API (nodejs/api) - pino logger setup, request/error middleware, and the Start/Request/Response/End logging pattern used in every controller and service method. Trigger whenever adding or editing a controller/service method, or touching log level/transport config.
---

# Logging in nodejs/api

## Setup

- Shared logger: [src/libs/logger.ts](../../../src/libs/logger.ts) - a single `pino` instance exported as `logger`, imported everywhere via the `../libs` barrel.
- Level comes from `config.logLevel` (`LOG_LEVEL` env var, default `info`).
- In `dev` (`NODE_ENV=dev`), output goes through `pino-pretty`; otherwise plain NDJSON for log aggregators.
- Errors MUST be logged under the `err` key - `logger.error({ err: error }, "message")` - so pino's `stdSerializers.err` formats a real stack trace. Never interpolate an error into the message string, and never `console.log`/`console.error`.

## Global middleware

- [src/middleware/logger.ts](../../../src/middleware/logger.ts) (`requestLogger`, registered `app.use('*', requestLogger)` in the root `index.ts`): logs `{ method, path, start }` at `info` before the request and `{ method, path, end, duration }` at `info` after. Don't add per-route request/duration logging - this already covers every route.
- [src/middleware/errorHandler.ts](../../../src/middleware/errorHandler.ts) (`errorHandler`, registered `app.onError(errorHandler)`): thrown `HTTPException`s are logged at `warn` (expected conditions - bad input, not found) and their status/message passed straight to the client; anything else is logged at `error` with full stack and turned into a generic `500 { error: "Internal Server Error" }` so internals never leak over HTTP. Don't catch-and-log errors yourself in a controller just to re-throw - let them propagate to this handler.

## Per-method pattern (controllers and services)

Every controller and service method follows the same shape - copy it exactly for new methods:

```ts
methodName = async (...) => {
    logger.info(`Start method: ${this.constructor.name}.${this.methodName.name}`);

    // ...parse/validate params...
    logger.debug({ ...params }, `Request:`);

    // ...do the work (service call in a controller; db query in a service)...

    if (!result) {
        logger.warn({ ...params }, `${this.constructor.name}.${this.methodName.name}: <Entity> not found`);
        // controller: throw new HTTPException(404, { message: "<Entity> not found" });
        // service: return null;
    }

    logger.debug({ ...result }, `Response:`);
    logger.info(`End method: ${this.constructor.name}.${this.methodName.name}`);

    return result;
}
```

Services additionally wrap the query in try/catch and log+rethrow on failure:

```ts
try {
    // db.insert/select/update/delete(...)
} catch (error) {
    logger.error({ err: error, ...params }, `Exception in ${this.constructor.name}.${this.methodName.name}: Failed to <action>`);
    throw error;
}
```

Reference implementations: [src/controllers/UserController.ts](../../../src/controllers/UserController.ts) and [src/services/UserService.ts](../../../src/services/UserService.ts) - every other controller/service in the project (`OrganizationUserService`, `CampaignController`, etc.) follows this identically.

## Rules of thumb

- `info` = method start/end markers only (cheap, always-on trail of what ran).
- `debug` = actual payloads (request params, response body) - verbose, off by default in prod.
- `warn` = expected "not found" / handled-miss conditions, not exceptions.
- `error` = always paired with `err: <Error>` and only for real exceptions (caught in services, or unhandled and caught by `errorHandler`).
- Never skip the Start/End pair even for trivial methods - it's what makes request traces readable in aggregated logs.

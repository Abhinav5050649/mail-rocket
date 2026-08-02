import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

/** HTTP methods whose handlers read a request body via `c.req.json()`. */
const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

/**
 * Global Hono middleware that rejects any body-bearing request
 * (POST/PUT/PATCH) whose `Content-Type` isn't `application/json`, before it
 * reaches a controller. Every controller in this API calls `c.req.json()`
 * unconditionally, so this turns a confusing parse failure (or a silently
 * mis-parsed body) into a clear, uniform 415 up front.
 *
 * Registered via `app.use('*', jsonOnly)` in `index.ts`, ahead of routing.
 *
 * @param c - Hono request context.
 * @param next - Calls the next middleware/handler in the chain.
 * @throws {HTTPException} 415 if a body-bearing request's `Content-Type`
 * is missing or isn't `application/json`.
 */
export const jsonOnly: MiddlewareHandler = async (c, next) => {
    if (BODY_METHODS.has(c.req.method)) {
        const contentType = c.req.header("content-type");

        if (!contentType || !contentType.toLowerCase().startsWith("application/json")) {
            throw new HTTPException(415, { message: "Unsupported Media Type: expected application/json" });
        }
    }

    await next();
};

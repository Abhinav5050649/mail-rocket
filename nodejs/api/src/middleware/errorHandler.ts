import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger, ValidationError } from "../libs";

/**
 * Global Hono error handler, registered via `app.onError(errorHandler)` in
 * `index.ts`. Replaces Hono's default behavior (a raw `console.error` plus a
 * plain-text "Internal Server Error" response) with structured pino logging
 * and a consistent JSON error shape.
 *
 * - `HTTPException`s (thrown deliberately by controllers for expected
 *   conditions like a missing param or a 404) log at `warn` and pass their
 *   status/message straight through to the client.
 * - `ValidationError`s (thrown by services for business-rule violations,
 *   e.g. scheduling a campaign with no sending identity) log at `warn` and
 *   are reported as a 400 with the error's own message.
 * - Anything else is treated as unexpected: logged at `error` with the full
 *   stack, and reported to the client as a generic 500 so internal details
 *   (stack traces, driver error messages, etc.) never leak over HTTP.
 *
 * @param err - The thrown error (an `HTTPException`, a `ValidationError`, or any other `Error`).
 * @param c - Hono request context, used for response shaping and logging metadata.
 * @returns A JSON `Response` with an appropriate status code.
 */
export const errorHandler: ErrorHandler = (err, c) => {
    const meta = { method: c.req.method, path: c.req.path };

    if (err instanceof HTTPException) {
        logger.warn({ ...meta, status: err.status, err }, `Handled error: ${err.message}`);
        return c.json({ error: err.message }, err.status);
    }

    if (err instanceof ValidationError) {
        logger.warn({ ...meta, err }, `Handled error: ${err.message}`);
        return c.json({ error: err.message }, 400);
    }

    logger.error({ ...meta, err }, "Unhandled exception");
    return c.json({ error: "Internal Server Error" }, 500);
};

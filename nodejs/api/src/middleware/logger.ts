import type { MiddlewareHandler } from "hono";
import { logger } from "../libs";

/**
 * Hono middleware that logs the start and end of every request, including
 * method, path, and total duration. Registered globally (`app.use('*', ...)`)
 * in `index.ts`.
 *
 * The `catch` below almost never runs: Hono's `compose()` resolves a thrown
 * error into a response via `app.onError` (`errorHandler`) at the dispatch
 * frame closest to where it was thrown, so `next()` here resolves normally
 * even on an error path - the end-of-request log still fires either way.
 * The catch only matters if something downstream throws a non-`Error` value,
 * which bypasses `onError` entirely.
 */
export const requestLogger: MiddlewareHandler = async(c, next) => {
    try {
        const start = Date.now();
        logger.info({ method: c.req.method, path: c.req.path, start });
        await next();
        const end = Date.now();
        logger.info({ method: c.req.method, path: c.req.path, end, duration: `${end - start}ms` });
    } catch (err) {
        logger.error({method: c.req.method, path: c.req.path, err})
    }
}

import type { MiddlewareHandler } from "hono";
import { logger } from "../libs";

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

import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Action, Subject } from "../libs";

/**
 * Middleware factory: requires the authenticated key's CASL ability (set by
 * `authenticate`) to grant `action` on `subject`. Must run after
 * `authenticate`. This is the server-side authorization boundary - the
 * Next.js app mirrors the same claims only to hide controls.
 *
 * @param action - The operation the route performs.
 * @param subject - The resource the route acts on.
 * @returns A Hono middleware handler.
 * @throws {HTTPException} 403 if the key's claims don't grant `action` on `subject`.
 */
export const requireAbility = (action: Action, subject: Subject): MiddlewareHandler => {
    return async (c, next) => {
        if (!c.get("principal").ability.can(action, subject)) {
            throw new HTTPException(403, { message: `Forbidden: key cannot ${action} ${subject}` });
        }

        await next();
    };
};

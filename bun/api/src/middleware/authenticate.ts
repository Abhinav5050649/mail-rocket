import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { verifyAuthToken } from "../libs";

/**
 * Augments Hono's `Context.set`/`.get` with the variables this middleware
 * stores, so `c.get('userId')` is typed as `string` everywhere without
 * needing every route file to declare `Hono<{ Variables: ... }>` generics.
 */
declare module "hono" {
    interface ContextVariableMap {
        /** id of the authenticated user, set by `authenticate` below. */
        userId: string;
    }
}

/**
 * Verifies the `Authorization: Bearer <token>` header on a request and
 * attaches the authenticated user's id to the context (`c.get('userId')`)
 * for downstream authorizer middleware and controllers to use.
 *
 * Registered on the protected route group in `AppRoute.ts` - `/auth/signup`
 * and `/auth/signin` are the only endpoints that skip this.
 *
 * @param c - Hono request context.
 * @param next - Calls the next middleware/handler in the chain.
 * @throws {HTTPException} 401 if the header is missing, malformed, or the
 * token is invalid/expired.
 */
export const authenticate: MiddlewareHandler = async (c, next) => {
    const authHeader = c.req.header("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new HTTPException(401, { message: "Missing or invalid Authorization header" });
    }

    const token = authHeader.slice("Bearer ".length);

    try {
        const payload = await verifyAuthToken(token);
        c.set("userId", payload.sub);
    } catch {
        throw new HTTPException(401, { message: "Invalid or expired token" });
    }

    await next();
};

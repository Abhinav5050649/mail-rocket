import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { claimsSchema, defineAbility, hashKey, type AppAbility, type Claim } from "../libs";
import { ApiKeyService } from "../services";

/** The authenticated principal: an API key and the CASL ability built from its claims. */
export interface Principal {
    /** id of the API key making the request. */
    keyId: string;
    /** The key's display name. */
    name: string;
    /** The key's validated claims. */
    claims: Claim[];
    /** CASL ability every route asks before acting (see `requireAbility`). */
    ability: AppAbility;
}

/**
 * Augments Hono's `Context.set`/`.get` with the variables this middleware
 * stores, so `c.get('principal')` is typed everywhere without every route
 * file declaring `Hono<{ Variables: ... }>` generics.
 */
declare module "hono" {
    interface ContextVariableMap {
        /** The authenticated API key, set by `authenticate` below. */
        principal: Principal;
    }
}

// Wired up once per process, same as the singleton services in each *Route.ts file.
const apiKeyService = new ApiKeyService();

/**
 * Reads the API key from a request: `Authorization: Bearer <key>` first,
 * then the `x-api-key` header.
 *
 * @param authorization - The `Authorization` header, if any.
 * @param apiKeyHeader - The `x-api-key` header, if any.
 * @returns The presented secret, or null if neither header carries one.
 */
export function extractApiKey(authorization: string | undefined, apiKeyHeader: string | undefined): string | null {
    if (authorization) {
        const [scheme, ...rest] = authorization.split(" ");
        // An Authorization header with any other scheme is a malformed request, not a fallback to x-api-key.
        if (scheme?.toLowerCase() !== "bearer") return null;
        return rest.join(" ").trim() || null;
    }
    return apiKeyHeader?.trim() || null;
}

/**
 * Authenticates the request's API key and attaches it, with its CASL
 * ability, to the context as `c.get('principal')`. One indexed lookup by
 * the key's hash - no join, no session. Registered on the protected route
 * group in `AppRoute.ts`; every endpoint goes through it.
 *
 * @param c - Hono request context.
 * @param next - Calls the next middleware/handler in the chain.
 * @throws {HTTPException} 401 if no key was presented, it matches no stored
 * key, or it has expired.
 */
export const authenticate: MiddlewareHandler = async (c, next) => {
    const secret = extractApiKey(c.req.header("authorization"), c.req.header("x-api-key"));

    if (!secret) {
        throw new HTTPException(401, { message: "Missing API key" });
    }

    const apiKey = await apiKeyService.getByHash(hashKey(secret));

    if (!apiKey) {
        throw new HTTPException(401, { message: "Invalid API key" });
    }

    if (apiKey.expires_at && apiKey.expires_at.getTime() <= Date.now()) {
        throw new HTTPException(401, { message: "API key has expired" });
    }

    // Re-validated on every request so a hand-edited row can never widen a key's grants.
    const claims = claimsSchema.parse(apiKey.claims);
    c.set("principal", { keyId: apiKey.id, name: apiKey.name, claims, ability: defineAbility(claims) });

    await next();
};

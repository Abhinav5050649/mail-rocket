import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { OrganizationUserService } from "../services";
import type { OrganizationUserRole } from "../models";

// Wired up once per process, same as the singleton services in each *Route.ts file.
const organizationUserService = new OrganizationUserService();

/**
 * Rank order for `organization_user.role`. Higher ranks include every
 * permission of the ranks below them, so an `editor`/`admin` automatically
 * satisfies a `viewer` requirement, and `admin` also satisfies `editor`.
 */
const ROLE_RANK: Record<OrganizationUserRole, number> = {
    viewer: 1,
    editor: 2,
    admin: 3,
};

/**
 * Middleware factory: requires the authenticated user (set by `authenticate`)
 * to hold at least `minRole` in the organization identified by the
 * `:organization_id` route param. Must run after `authenticate`.
 *
 * @param minRole - Minimum role required to proceed.
 * @returns A Hono middleware handler.
 * @throws {HTTPException} 400 if the route has no `:organization_id` param.
 * @throws {HTTPException} 403 if the user isn't a member of the organization,
 * or their role doesn't meet `minRole`.
 */
export const requireRole = (minRole: OrganizationUserRole): MiddlewareHandler => {
    return async (c, next) => {
        const organizationId = c.req.param("organization_id");
        const userId = c.get("userId");

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        const membership = await organizationUserService.getByOrganizationAndUser(organizationId, userId);

        if (!membership || ROLE_RANK[membership.role ?? "viewer"] < ROLE_RANK[minRole]) {
            throw new HTTPException(403, { message: "Forbidden: insufficient role" });
        }

        await next();
    };
};

/**
 * Middleware: allows the request only if the authenticated user (set by
 * `authenticate`) is acting on their own `/users/:id` record. Self-service
 * profile edits/deletes don't need any organization role - see the `viewer`
 * authorizer rule for user's personal endpoints.
 *
 * @param c - Hono request context; expects an `id` route param.
 * @param next - Calls the next middleware/handler in the chain.
 * @throws {HTTPException} 403 if the `id` param doesn't match the
 * authenticated user's own id.
 */
export const requireSelf: MiddlewareHandler = async (c, next) => {
    const targetUserId = c.req.param("id");
    const userId = c.get("userId");

    if (targetUserId !== userId) {
        throw new HTTPException(403, { message: "Forbidden: not your own account" });
    }

    await next();
};

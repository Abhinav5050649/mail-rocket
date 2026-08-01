import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../libs";
import { UserService, OrganizationUserService } from "../services";

/**
 * HTTP layer for organization-membership endpoints
 * (`/organizations/:organization_id/users`). Translates Hono `Context`
 * objects into `UserService`/`OrganizationUserService` calls and maps the
 * results to HTTP responses/errors. A "member" response combines the
 * user's profile fields with the role from their `organization_user`
 * membership row; `id` on that response is the *membership's* id, while
 * `user_id` is the underlying user's own id.
 */
export class OrganizationUserController {
    constructor(private userService: UserService, private organizationUserService: OrganizationUserService) {
    }

    /**
     * GET /organizations/:organization_id/users
     * Lists the members of an organization, each combined with their role.
     *
     * @param c - Hono request context; expects an `organization_id` route
     * param. Accepts optional `limit` (max rows to return) and `offset`
     * (rows to skip before returning results) query params.
     * @returns JSON array of members.
     * @throws {HTTPException} 400 if the `organization_id` param is missing.
     */
    getAll = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);

        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        const limitParam = c.req.query('limit');
        const offsetParam = c.req.query('offset');
        const limit = limitParam !== undefined ? Number(limitParam) : undefined;
        const offset = offsetParam !== undefined ? Number(offsetParam) : undefined;

        logger.debug({ organizationId, limit, offset }, `Request:`);

        const rows = await this.organizationUserService.getUsersByOrganization(organizationId, { limit, offset });
        const members = rows.map(({ user, membership }) => ({
            id: membership.id,
            user_id: user.id,
            organization_id: membership.organization_id,
            role: membership.role,
            first_name: user.first_name,
            last_name: user.last_name,
            normalized_name: user.normalized_name,
            description: user.description,
            created_at: membership.created_at,
            updated_at: membership.updated_at,
        }));

        logger.debug({ organizationId, count: members.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

        return c.json(members);
    }

    /**
     * POST /organizations/:organization_id/users
     * Creates a new user and adds them to the organization in one step.
     *
     * @param c - Hono request context; expects an `organization_id` route
     * param and a JSON body with the user's profile fields plus an
     * optional `role` for their membership (defaults to `viewer`).
     * @returns JSON response with the created user, combined with their
     * `role` and membership `id`.
     * @throws {HTTPException} 400 if the `organization_id` param is missing.
     */
    post = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.post.name}`);

        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        const { role, ...userFields } = await c.req.json();

        logger.debug({ organizationId, userFields, role }, `Request:`);

        const user = await this.userService.create(userFields);
        const membership = await this.organizationUserService.create({ organization_id: organizationId, user_id: user.id, role });

        logger.debug({ organizationId, user, membership }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.post.name}`);

        return c.json({ ...user, organization_id: organizationId, role: membership.role, membership_id: membership.id }, 201);
    }

    /**
     * PATCH /organizations/:organization_id/users/:user_id
     * Updates a member's role (or membership metadata) within the
     * organization. Does not touch the user's own profile fields - see
     * `PATCH /users/:id` for that.
     *
     * @param c - Hono request context; expects `organization_id` and
     * `user_id` route params and a JSON body with the membership fields to
     * update.
     * @returns JSON response with the updated membership row.
     * @throws {HTTPException} 400 if a route param is missing.
     * @throws {HTTPException} 404 if the user isn't a member of the organization.
     */
    update = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);

        const organizationId = c.req.param('organization_id');
        const userId = c.req.param('user_id');

        if (!organizationId || !userId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId, userId" });
        }

        const body = await c.req.json();

        logger.debug({ organizationId, userId, body }, `Request:`);

        const membership = await this.organizationUserService.getByOrganizationAndUser(organizationId, userId);

        if (!membership) {
            logger.warn({ organizationId, userId }, `${this.constructor.name}.${this.update.name}: Membership not found`);
            throw new HTTPException(404, { message: "Membership not found" });
        }

        const updated = await this.organizationUserService.update(membership.id, body);

        logger.debug({ organizationId, userId, updated }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

        return c.json(updated);
    }

    /**
     * DELETE /organizations/:organization_id/users/:user_id
     * Removes a user from the organization by deleting their membership
     * row. The user's account itself is untouched - see `DELETE /users/:id`
     * to delete the account entirely.
     *
     * @param c - Hono request context; expects `organization_id` and
     * `user_id` route params.
     * @returns JSON response with the deleted membership row.
     * @throws {HTTPException} 400 if a route param is missing.
     * @throws {HTTPException} 404 if the user isn't a member of the organization.
     */
    delete = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);

        const organizationId = c.req.param('organization_id');
        const userId = c.req.param('user_id');

        if (!organizationId || !userId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId, userId" });
        }

        logger.debug({ organizationId, userId }, `Request:`);

        const membership = await this.organizationUserService.getByOrganizationAndUser(organizationId, userId);

        if (!membership) {
            logger.warn({ organizationId, userId }, `${this.constructor.name}.${this.delete.name}: Membership not found`);
            throw new HTTPException(404, { message: "Membership not found" });
        }

        const deleted = await this.organizationUserService.delete(membership.id);

        logger.debug({ organizationId, userId, deleted }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

        return c.json(deleted);
    }
}

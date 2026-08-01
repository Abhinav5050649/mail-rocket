import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../libs";
import { UserService, OrganizationUserService } from "../services";

/**
 * HTTP layer for user-related endpoints. Translates Hono `Context` objects
 * into `UserService`/`OrganizationUserService` calls and maps the results
 * to HTTP responses/errors. A user's identity is organization-independent -
 * see `OrganizationUserController` for adding/removing/listing a user's
 * organization memberships and roles.
 */
export class UserController {
    constructor(private userService: UserService, private organizationUserService: OrganizationUserService) {
    }

    /**
     * POST /users
     * Creates a new standalone user account, with no organization
     * membership yet - add one via
     * `POST /organizations/:organization_id/users` or
     * `PATCH /organizations/:organization_id/users/:user_id`.
     *
     * @param c - Hono request context; expects a JSON body with the user's
     * profile fields.
     * @returns JSON response with the created user.
     */
    post = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.post.name}`);

        const body = await c.req.json();

        logger.debug({ body }, `Request:`);

        const user = await this.userService.create(body);

        logger.debug({ user }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.post.name}`);

        return c.json(user, 201);
    }

    /**
     * GET /users/:id
     * Fetches a single user by id.
     *
     * @param c - Hono request context; expects an `id` route param.
     * @returns JSON response with the user document.
     * @throws {HTTPException} 400 if the `id` param is missing.
     * @throws {HTTPException} 404 if no user matches the given id.
     */
    get = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.get.name}`);

        const userId = c.req.param('id');

        if (!userId) {
            throw new HTTPException(400, { message: "Missing Parameters: userId" });
        }

        logger.debug({ userId }, `Request:`);

        const user = await this.userService.getById(userId);

        if (!user) {
            logger.warn({ userId }, `${this.constructor.name}.${this.get.name}: User not found`);
            throw new HTTPException(404, { message: "User not found" });
        }

        logger.debug({ user }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.get.name}`);

        return c.json(user);
    }

    /**
     * GET /users/:id/organizations
     * Lists the organizations a user belongs to, each combined with the
     * role they hold there.
     *
     * @param c - Hono request context; expects an `id` route param.
     * Accepts optional `limit` (max rows to return) and `offset` (rows to
     * skip before returning results) query params.
     * @returns JSON array of memberships.
     * @throws {HTTPException} 400 if the `id` param is missing.
     */
    getOrganizations = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.getOrganizations.name}`);

        const userId = c.req.param('id');

        if (!userId) {
            throw new HTTPException(400, { message: "Missing Parameters: userId" });
        }

        const limitParam = c.req.query('limit');
        const offsetParam = c.req.query('offset');
        const limit = limitParam !== undefined ? Number(limitParam) : undefined;
        const offset = offsetParam !== undefined ? Number(offsetParam) : undefined;

        logger.debug({ userId, limit, offset }, `Request:`);

        const rows = await this.organizationUserService.getOrganizationsByUser(userId, { limit, offset });
        const memberships = rows.map(({ organization, membership }) => ({
            id: membership.id,
            organization_id: organization.id,
            role: membership.role,
            name: organization.name,
            normalized_name: organization.normalized_name,
            description: organization.description,
            created_at: membership.created_at,
            updated_at: membership.updated_at,
        }));

        logger.debug({ userId, count: memberships.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getOrganizations.name}`);

        return c.json(memberships);
    }

    /**
     * PATCH /users/:id
     * Partially updates a user's profile.
     *
     * @param c - Hono request context; expects an `id` route param and a
     * JSON body with the fields to update.
     * @returns JSON response with the updated user.
     * @throws {HTTPException} 400 if the `id` param is missing.
     * @throws {HTTPException} 404 if no user matches the given id.
     */
    update = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);

        const userId = c.req.param('id');

        if (!userId) {
            throw new HTTPException(400, { message: "Missing Parameters: userId" });
        }

        const body = await c.req.json();

        logger.debug({ userId, body }, `Request:`);

        const user = await this.userService.update(userId, body);

        if (!user) {
            logger.warn({ userId }, `${this.constructor.name}.${this.update.name}: User not found`);
            throw new HTTPException(404, { message: "User not found" });
        }

        logger.debug({ user }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

        return c.json(user);
    }

    /**
     * DELETE /users/:id
     * Deletes a user account entirely (all of their organization
     * memberships go with it, via the FK). To remove a user from a single
     * organization without deleting their account, use
     * `DELETE /organizations/:organization_id/users/:user_id` instead.
     *
     * @param c - Hono request context; expects an `id` route param.
     * @returns JSON response with the deleted user.
     * @throws {HTTPException} 400 if the `id` param is missing.
     * @throws {HTTPException} 404 if no user matches the given id.
     */
    delete = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);

        const userId = c.req.param('id');

        if (!userId) {
            throw new HTTPException(400, { message: "Missing Parameters: userId" });
        }

        logger.debug({ userId }, `Request:`);

        const user = await this.userService.delete(userId);

        if (!user) {
            logger.warn({ userId }, `${this.constructor.name}.${this.delete.name}: User not found`);
            throw new HTTPException(404, { message: "User not found" });
        }

        logger.debug({ user }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

        return c.json(user);
    }
}

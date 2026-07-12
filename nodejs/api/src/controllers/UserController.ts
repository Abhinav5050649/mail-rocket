import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../libs";
import { UserService } from "../services";

/**
 * HTTP layer for user-related endpoints. Translates Hono `Context` objects
 * into `UserService` calls and maps the results to HTTP responses/errors.
 */
export class UserController {
    constructor(private userService: UserService) {
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
        const userId = c.req.param('id');

        if (!userId) {
            throw new HTTPException(400, { message: "Missing Parameters: userId" });
        }

        logger.info({ userId }, `${this.constructor.name}.${this.get.name}: Fetching user`);

        const user = await this.userService.getById(userId);

        if (!user) {
            logger.warn({ userId }, `${this.constructor.name}.${this.get.name}: User not found`);
            throw new HTTPException(404, { message: "User not found" });
        }

        logger.info({ userId }, `${this.constructor.name}.${this.get.name}: User fetched successfully`);

        return c.json(user);
    }

    /**
     * GET /organizations/:organization_id/users
     * Lists users belonging to an organization.
     *
     * @param c - Hono request context; expects an `organization_id` route param.
     * @returns JSON array of matching users.
     * @throws {HTTPException} 400 if the `organization_id` param is missing.
     */
    getAll = async (c: Context) => {
        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        logger.info({ organizationId }, `${this.constructor.name}.${this.getAll.name}: Fetching users`);

        const users = await this.userService.getByOrganization(organizationId);

        logger.info({ organizationId, count: users.length }, `${this.constructor.name}.${this.getAll.name}: Users fetched successfully`);

        return c.json(users);
    }

    /**
     * POST /organizations/:organization_id/users
     * Creates a new user within an organization.
     *
     * @param c - Hono request context; expects an `organization_id` route
     * param and a JSON body with the user fields.
     * @returns JSON response with the created user.
     * @throws {HTTPException} 400 if the `organization_id` param is missing.
     */
    post = async (c: Context) => {
        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        const body = await c.req.json();

        logger.info({ organizationId, body }, `${this.constructor.name}.${this.post.name}: Creating user`);

        const user = await this.userService.create({ ...body, organization_id: organizationId });

        logger.info({ organizationId, userId: user.id }, `${this.constructor.name}.${this.post.name}: User created successfully`);

        return c.json(user, 201);
    }

    /**
     * PATCH /organizations/:organization_id/users/:id
     * Partially updates a user.
     *
     * @param c - Hono request context; expects an `id` route param and a
     * JSON body with the fields to update.
     * @returns JSON response with the updated user.
     * @throws {HTTPException} 400 if the `id` param is missing.
     * @throws {HTTPException} 404 if no user matches the given id.
     */
    update = async (c: Context) => {
        const userId = c.req.param('id');

        if (!userId) {
            throw new HTTPException(400, { message: "Missing Parameters: userId" });
        }

        const body = await c.req.json();

        logger.info({ userId, body }, `${this.constructor.name}.${this.update.name}: Updating user`);

        const user = await this.userService.update(userId, body);

        if (!user) {
            logger.warn({ userId }, `${this.constructor.name}.${this.update.name}: User not found`);
            throw new HTTPException(404, { message: "User not found" });
        }

        logger.info({ userId }, `${this.constructor.name}.${this.update.name}: User updated successfully`);

        return c.json(user);
    }

    /**
     * DELETE /organizations/:organization_id/users/:id
     * Deletes a user.
     *
     * @param c - Hono request context; expects an `id` route param.
     * @returns JSON response with the deleted user.
     * @throws {HTTPException} 400 if the `id` param is missing.
     * @throws {HTTPException} 404 if no user matches the given id.
     */
    delete = async (c: Context) => {
        const userId = c.req.param('id');

        if (!userId) {
            throw new HTTPException(400, { message: "Missing Parameters: userId" });
        }

        logger.info({ userId }, `${this.constructor.name}.${this.delete.name}: Deleting user`);

        const user = await this.userService.delete(userId);

        if (!user) {
            logger.warn({ userId }, `${this.constructor.name}.${this.delete.name}: User not found`);
            throw new HTTPException(404, { message: "User not found" });
        }

        logger.info({ userId }, `${this.constructor.name}.${this.delete.name}: User deleted successfully`);

        return c.json(user);
    }
}

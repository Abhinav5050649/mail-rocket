import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger, DEFAULT_PAGE_SIZE, decodePageToken, buildPage } from "../libs";
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
     * GET /organizations/:organization_id/users
     * Lists users belonging to an organization.
     *
     * @param c - Hono request context; expects an `organization_id` route
     * param. Accepts optional `count` (max rows to return, defaults to
     * {@link DEFAULT_PAGE_SIZE}) and `page_token` (the base64-encoded
     * `next_page_token` from the previous response) query params.
     * @returns JSON `{ data, next_page_token }` - `next_page_token` is
     * `null` once the last page has been reached.
     * @throws {HTTPException} 400 if the `organization_id` param is missing.
     */
    getAll = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);

        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        const countParam = c.req.query('count');
        const pageTokenParam = c.req.query('page_token');
        const count = countParam !== undefined ? Number(countParam) : DEFAULT_PAGE_SIZE;
        const pageToken = pageTokenParam ? decodePageToken(pageTokenParam) : undefined;

        logger.debug({ organizationId, count, pageToken }, `Request:`);

        const users = await this.userService.getByOrganization(organizationId, { count, pageToken });

        logger.debug({ organizationId, count: users.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

        return c.json(buildPage(users, count));
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
        logger.info(`Start method: ${this.constructor.name}.${this.post.name}`);

        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        const body = await c.req.json();

        logger.debug({ organizationId, body }, `Request:`);

        const user = await this.userService.create({ ...body, organization_id: organizationId });

        logger.debug({ organizationId, user }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.post.name}`);

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
     * DELETE /organizations/:organization_id/users/:id
     * Deletes a user.
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

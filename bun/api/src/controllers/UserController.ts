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
}

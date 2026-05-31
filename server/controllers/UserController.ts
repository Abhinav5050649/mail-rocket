import type { Context } from "hono";
import { logger } from "../libs";
import { UserService } from "../services";

export class UserController {
    constructor(private userService: UserService) {
    }

    get = async (c: Context) => {
        try {
            const userId = c.req.param('id');

            if (!userId) {
                throw new Error(`Missing Parameters: userId`);
            }

            const user = await this.userService.get(userId);

            return c.json(user);
        } catch (error) {
            logger.error(`Exception in ${this.constructor.name}.${this.get.name}: Failed to get user`);
            throw error;
        }
    }
}
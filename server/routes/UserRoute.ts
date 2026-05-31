import { Hono } from "hono";
import { UserController } from "../controllers";
import { UserService } from "../services";

const userService = new UserService();
const userController = new UserController(userService);

export const userRoute = new Hono()
    .get('/:id', userController.get)


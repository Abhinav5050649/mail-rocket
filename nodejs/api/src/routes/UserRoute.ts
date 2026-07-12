import { Hono } from "hono";
import { UserController } from "../controllers";
import { UserService } from "../services";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const userService = new UserService();
const userController = new UserController(userService);

/**
 * Routes for the `/users` resource.
 *
 * - GET /:id - fetch a single user by id.
 */
export const userRoute = new Hono()
    .get('/:id', userController.get)

/**
 * Routes for the `/organizations/:organization_id/users` resource.
 *
 * - GET    /     - list users in the organization.
 * - POST   /     - create a user.
 * - GET    /:id  - fetch a single user (shared with `userRoute` above).
 * - PATCH  /:id  - partially update a user.
 * - DELETE /:id  - delete a user.
 */
export const organizationUserRoute = new Hono()
    .get('/', userController.getAll)
    .post('/', userController.post)
    .get('/:id', userController.get)
    .patch('/:id', userController.update)
    .delete('/:id', userController.delete)

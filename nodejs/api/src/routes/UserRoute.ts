import { Hono } from "hono";
import { UserController } from "../controllers";
import { UserService, OrganizationUserService } from "../services";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const userService = new UserService();
const organizationUserService = new OrganizationUserService();
const userController = new UserController(userService, organizationUserService);

/**
 * Routes for the `/users` resource. A user's identity is
 * organization-independent - see `OrganizationUserRoute` for managing
 * which organizations a user belongs to and their role in each.
 *
 * - POST   /                - create a standalone user (no org membership yet).
 * - GET    /:id              - fetch a single user by id.
 * - GET    /:id/organizations - list the organizations a user belongs to, with role.
 * - PATCH  /:id              - partially update a user's profile.
 * - DELETE /:id              - delete a user account entirely.
 */
export const userRoute = new Hono()
    .post('/', userController.post)
    .get('/:id', userController.get)
    .get('/:id/organizations', userController.getOrganizations)
    .patch('/:id', userController.update)
    .delete('/:id', userController.delete)

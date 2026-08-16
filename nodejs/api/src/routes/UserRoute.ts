import { Hono } from "hono";
import { UserController } from "../controllers";
import { UserService, OrganizationUserService } from "../services";
import { requireSelf } from "../middleware";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const userService = new UserService();
const organizationUserService = new OrganizationUserService();
const userController = new UserController(userService, organizationUserService);

/**
 * Routes for the `/users` resource. A user's identity is
 * organization-independent - see `OrganizationUserRoute` for managing
 * which organizations a user belongs to and their role in each. Editing or
 * deleting a profile is self-service - it only requires the caller to be
 * acting on their own account (`requireSelf`), not any elevated
 * organization role.
 *
 * - POST   /                - create a standalone user (no org membership yet).
 * - GET    /:id              - fetch a single user by id.
 * - GET    /:id/organizations - list the organizations a user belongs to, with role.
 * - PATCH  /:id              - partially update a user's own profile.
 * - DELETE /:id              - delete a user's own account entirely.
 */
export const userRoute = new Hono()
    .post('/', userController.post)
    .get('/:id', userController.get)
    .get('/:id/organizations', userController.getOrganizations)
    .patch('/:id', requireSelf, userController.update)
    .delete('/:id', requireSelf, userController.delete)

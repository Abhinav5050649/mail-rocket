import { Hono } from "hono";
import { OrganizationUserController } from "../controllers";
import { UserService, OrganizationUserService } from "../services";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const userService = new UserService();
const organizationUserService = new OrganizationUserService();
const organizationUserController = new OrganizationUserController(userService, organizationUserService);

/**
 * Routes for the `/organizations/:organization_id/users` resource: an
 * organization's membership list. A user can belong to multiple
 * organizations, each with its own role, via the `organization_user` join
 * table.
 *
 * - GET    /           - list the organization's members, each with their role.
 * - POST   /           - create a new user and add them as a member in one step.
 * - PATCH  /:user_id   - update a member's role (or membership metadata).
 * - DELETE /:user_id   - remove a member from the organization (their account is untouched).
 */
export const organizationUserRoute = new Hono()
    .get('/', organizationUserController.getAll)
    .post('/', organizationUserController.post)
    .patch('/:user_id', organizationUserController.update)
    .delete('/:user_id', organizationUserController.delete)

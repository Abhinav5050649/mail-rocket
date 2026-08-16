import { Hono } from "hono";
import { OrganizationUserController } from "../controllers";
import { UserService, OrganizationUserService } from "../services";
import { requireRole } from "../middleware";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const userService = new UserService();
const organizationUserService = new OrganizationUserService();
const organizationUserController = new OrganizationUserController(userService, organizationUserService);

/**
 * Routes for the `/organizations/:organization_id/users` resource: an
 * organization's membership list. A user can belong to multiple
 * organizations, each with its own role, via the `organization_user` join
 * table. Membership management is organization-related, so only an `admin`
 * may add, change, or remove members - any member may list them.
 *
 * - GET    /           - list the organization's members, each with their role (any member).
 * - POST   /           - create a new user and add them as a member in one step (admin only).
 * - PATCH  /:user_id   - update a member's role (or membership metadata) (admin only).
 * - DELETE /:user_id   - remove a member from the organization (their account is untouched) (admin only).
 */
export const organizationUserRoute = new Hono()
    .get('/', requireRole('viewer'), organizationUserController.getAll)
    .post('/', requireRole('admin'), organizationUserController.post)
    .patch('/:user_id', requireRole('admin'), organizationUserController.update)
    .delete('/:user_id', requireRole('admin'), organizationUserController.delete)

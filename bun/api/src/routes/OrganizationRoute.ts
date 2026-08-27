import { Hono } from "hono";
import { OrganizationController } from "../controllers";
import { OrganizationService, OrganizationUserService } from "../services";
import { requireRole } from "../middleware";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const organizationService = new OrganizationService();
const organizationUserService = new OrganizationUserService();
const organizationController = new OrganizationController(organizationService, organizationUserService);

/**
 * Routes for the `/organizations` resource. Only an `admin` may create/
 * update/delete a specific organization; `GET /` (listing every
 * organization) and `POST /` (creating one) have no `:organization_id` to
 * check a role against, so they only require the caller to be
 * authenticated - see `OrganizationController.post` for how a newly
 * created organization gets its first admin.
 *
 * - GET    /     - list organizations.
 * - POST   /     - create an organization (caller becomes its admin).
 * - GET    /:organization_id - fetch a single organization (any member).
 * - PATCH  /:organization_id - partially update an organization (admin only).
 * - DELETE /:organization_id - delete an organization (admin only).
 */
export const organizationRoute = new Hono()
    .get('/', organizationController.getAll)
    .post('/', organizationController.post)
    .get('/:organization_id', requireRole('viewer'), organizationController.get)
    .patch('/:organization_id', requireRole('admin'), organizationController.update)
    .delete('/:organization_id', requireRole('admin'), organizationController.delete)

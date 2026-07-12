import { Hono } from "hono";
import { OrganizationController } from "../controllers";
import { OrganizationService } from "../services";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const organizationService = new OrganizationService();
const organizationController = new OrganizationController(organizationService);

/**
 * Routes for the `/organizations` resource.
 *
 * - GET    /     - list organizations.
 * - POST   /     - create an organization.
 * - GET    /:organization_id - fetch a single organization.
 * - PATCH  /:organization_id - partially update an organization.
 * - DELETE /:organization_id - delete an organization.
 */
export const organizationRoute = new Hono()
    .get('/', organizationController.getAll)
    .post('/', organizationController.post)
    .get('/:organization_id', organizationController.get)
    .patch('/:organization_id', organizationController.update)
    .delete('/:organization_id', organizationController.delete)

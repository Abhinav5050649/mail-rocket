import { Hono } from "hono";
import { OrganizationController } from "../controllers";
import { OrganizationService } from "../services";
import { requireAbility } from "../middleware";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const organizationService = new OrganizationService();
const organizationController = new OrganizationController(organizationService);

/**
 * Routes for the `/organization` resource: the single profile of the
 * organization running this instance. Seeded at boot, so there is no list,
 * create or delete.
 *
 * - GET   / - fetch the organization (`read Organization`).
 * - PATCH / - partially update the organization (`update Organization`).
 */
export const organizationRoute = new Hono()
    .get('/', requireAbility('read', 'Organization'), organizationController.get)
    .patch('/', requireAbility('update', 'Organization'), organizationController.update)

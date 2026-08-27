import { Hono } from "hono";
import { IdentityController } from "../controllers";
import { IdentityService } from "../services";
import { requireRole } from "../middleware";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const identityService = new IdentityService();
const identityController = new IdentityController(identityService);

/**
 * Routes for the `/organizations/:organization_id/identities` resource.
 * Reads require `viewer`+; writes require `editor`+.
 *
 * - GET    /               - list identities in the organization.
 * - POST   /               - create an identity.
 * - GET    /:identity_id   - fetch a single identity.
 * - PATCH  /:identity_id   - partially update an identity.
 * - DELETE /:identity_id   - delete an identity.
 */
export const identityRoute = new Hono()
    .get('/', requireRole('viewer'), identityController.getAll)
    .post('/', requireRole('editor'), identityController.post)
    .get('/:identity_id', requireRole('viewer'), identityController.get)
    .patch('/:identity_id', requireRole('editor'), identityController.update)
    .delete('/:identity_id', requireRole('editor'), identityController.delete)

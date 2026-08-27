import { Hono } from "hono";
import { ContactDetailsController } from "../controllers";
import { ContactDetailsService } from "../services";
import { requireRole } from "../middleware";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const contactDetailsService = new ContactDetailsService();
const contactDetailsController = new ContactDetailsController(contactDetailsService);

/**
 * Routes for the `/organizations/:organization_id/contact-details` resource.
 * Reads require `viewer`+; writes require `editor`+.
 *
 * - GET    /                     - list contact details in the organization.
 * - POST   /                     - create a contact-details row.
 * - GET    /:contact_details_id  - fetch a single contact-details row.
 * - PATCH  /:contact_details_id  - partially update a contact-details row.
 * - DELETE /:contact_details_id  - delete a contact-details row.
 */
export const contactDetailsRoute = new Hono()
    .get('/', requireRole('viewer'), contactDetailsController.getAll)
    .post('/', requireRole('editor'), contactDetailsController.post)
    .get('/:contact_details_id', requireRole('viewer'), contactDetailsController.get)
    .patch('/:contact_details_id', requireRole('editor'), contactDetailsController.update)
    .delete('/:contact_details_id', requireRole('editor'), contactDetailsController.delete)

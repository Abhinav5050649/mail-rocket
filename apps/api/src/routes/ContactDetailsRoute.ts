import { Hono } from "hono";
import { ContactDetailsController } from "../controllers";
import { ContactDetailsService, OrganizationService } from "../services";
import { requireAbility } from "../middleware";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const contactDetailsService = new ContactDetailsService();
const organizationService = new OrganizationService();
const contactDetailsController = new ContactDetailsController(contactDetailsService, organizationService);

/**
 * Routes for the `/contact-details` resource.
 * Each endpoint requires the key to hold the matching
 * `ContactDetails` claim (`read` for GETs, `create`/`update`/`delete` for writes).
 *
 * - GET    /                     - list all contact details.
 * - POST   /                     - create a contact-details row.
 * - GET    /:contact_details_id  - fetch a single contact-details row.
 * - PATCH  /:contact_details_id  - partially update a contact-details row.
 * - DELETE /:contact_details_id  - delete a contact-details row.
 */
export const contactDetailsRoute = new Hono()
    .get('/', requireAbility('read', 'ContactDetails'), contactDetailsController.getAll)
    .post('/', requireAbility('create', 'ContactDetails'), contactDetailsController.post)
    .get('/:contact_details_id', requireAbility('read', 'ContactDetails'), contactDetailsController.get)
    .patch('/:contact_details_id', requireAbility('update', 'ContactDetails'), contactDetailsController.update)
    .delete('/:contact_details_id', requireAbility('delete', 'ContactDetails'), contactDetailsController.delete)

import { Hono } from "hono";
import { AddressController } from "../controllers";
import { AddressService } from "../services";
import { requireRole } from "../middleware";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const addressService = new AddressService();
const addressController = new AddressController(addressService);

/**
 * Routes for the `/organizations/:organization_id/addresses` resource.
 * Reads require `viewer`+; writes require `editor`+.
 *
 * - GET    /            - list addresses in the organization.
 * - POST   /            - create an address.
 * - GET    /:address_id - fetch a single address.
 * - PATCH  /:address_id - partially update an address.
 * - DELETE /:address_id - delete an address.
 */
export const addressRoute = new Hono()
    .get('/', requireRole('viewer'), addressController.getAll)
    .post('/', requireRole('editor'), addressController.post)
    .get('/:address_id', requireRole('viewer'), addressController.get)
    .patch('/:address_id', requireRole('editor'), addressController.update)
    .delete('/:address_id', requireRole('editor'), addressController.delete)

import { Hono } from "hono";
import { AddressController } from "../controllers";
import { AddressService, OrganizationService } from "../services";
import { requireAbility } from "../middleware";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const addressService = new AddressService();
const organizationService = new OrganizationService();
const addressController = new AddressController(addressService, organizationService);

/**
 * Routes for the `/addresses` resource.
 * Each endpoint requires the key to hold the matching
 * `Address` claim (`read` for GETs, `create`/`update`/`delete` for writes).
 *
 * - GET    /            - list all addresses.
 * - POST   /            - create an address.
 * - GET    /:address_id - fetch a single address.
 * - PATCH  /:address_id - partially update an address.
 * - DELETE /:address_id - delete an address.
 */
export const addressRoute = new Hono()
    .get('/', requireAbility('read', 'Address'), addressController.getAll)
    .post('/', requireAbility('create', 'Address'), addressController.post)
    .get('/:address_id', requireAbility('read', 'Address'), addressController.get)
    .patch('/:address_id', requireAbility('update', 'Address'), addressController.update)
    .delete('/:address_id', requireAbility('delete', 'Address'), addressController.delete)

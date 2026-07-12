import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../libs";
import { AddressService } from "../services";

/**
 * HTTP layer for address-related endpoints. Translates Hono `Context`
 * objects into `AddressService` calls and maps the results to HTTP
 * responses/errors. Addresses are nested under an organization:
 * `/organizations/:organization_id/addresses`.
 */
export class AddressController {
    constructor(private addressService: AddressService) {
    }

    /**
     * GET /organizations/:organization_id/addresses
     * Lists addresses belonging to an organization.
     *
     * @param c - Hono request context; expects an `organization_id` route
     * param. Accepts an optional `user_id` query param to scope the list to
     * a single user, and an optional `is_primary` query param to filter by
     * the primary-address flag.
     * @returns JSON array of matching addresses.
     * @throws {HTTPException} 400 if the `organization_id` param is missing.
     */
    getAll = async (c: Context) => {
        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        const userId = c.req.query('user_id');
        const isPrimaryParam = c.req.query('is_primary');
        const isPrimary = isPrimaryParam === undefined ? undefined : isPrimaryParam === 'true';

        logger.info({ organizationId, userId, isPrimary }, `${this.constructor.name}.${this.getAll.name}: Fetching addresses`);

        const addresses = userId
            ? await this.addressService.getByUser(userId)
            : await this.addressService.getByOrganization(organizationId, isPrimary);

        logger.info({ organizationId, count: addresses.length }, `${this.constructor.name}.${this.getAll.name}: Addresses fetched successfully`);

        return c.json(addresses);
    }

    /**
     * POST /organizations/:organization_id/addresses
     * Creates a new address within an organization.
     *
     * @param c - Hono request context; expects an `organization_id` route
     * param and a JSON body with the address fields.
     * @returns JSON response with the created address.
     * @throws {HTTPException} 400 if the `organization_id` param is missing.
     */
    post = async (c: Context) => {
        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        const body = await c.req.json();

        logger.info({ organizationId, body }, `${this.constructor.name}.${this.post.name}: Creating address`);

        const address = await this.addressService.create({ ...body, organization_id: organizationId });

        logger.info({ organizationId, addressId: address.id }, `${this.constructor.name}.${this.post.name}: Address created successfully`);

        return c.json(address, 201);
    }

    /**
     * GET /organizations/:organization_id/addresses/:address_id
     * Fetches a single address by id.
     *
     * @param c - Hono request context; expects an `address_id` route param.
     * @returns JSON response with the address document.
     * @throws {HTTPException} 400 if the `address_id` param is missing.
     * @throws {HTTPException} 404 if no address matches the given id.
     */
    get = async (c: Context) => {
        const addressId = c.req.param('address_id');

        if (!addressId) {
            throw new HTTPException(400, { message: "Missing Parameters: addressId" });
        }

        logger.info({ addressId }, `${this.constructor.name}.${this.get.name}: Fetching address`);

        const address = await this.addressService.getById(addressId);

        if (!address) {
            logger.warn({ addressId }, `${this.constructor.name}.${this.get.name}: Address not found`);
            throw new HTTPException(404, { message: "Address not found" });
        }

        logger.info({ addressId }, `${this.constructor.name}.${this.get.name}: Address fetched successfully`);

        return c.json(address);
    }

    /**
     * PATCH /organizations/:organization_id/addresses/:address_id
     * Partially updates an address.
     *
     * @param c - Hono request context; expects an `address_id` route param
     * and a JSON body with the fields to update.
     * @returns JSON response with the updated address.
     * @throws {HTTPException} 400 if the `address_id` param is missing.
     * @throws {HTTPException} 404 if no address matches the given id.
     */
    update = async (c: Context) => {
        const addressId = c.req.param('address_id');

        if (!addressId) {
            throw new HTTPException(400, { message: "Missing Parameters: addressId" });
        }

        const body = await c.req.json();

        logger.info({ addressId, body }, `${this.constructor.name}.${this.update.name}: Updating address`);

        const address = await this.addressService.update(addressId, body);

        if (!address) {
            logger.warn({ addressId }, `${this.constructor.name}.${this.update.name}: Address not found`);
            throw new HTTPException(404, { message: "Address not found" });
        }

        logger.info({ addressId }, `${this.constructor.name}.${this.update.name}: Address updated successfully`);

        return c.json(address);
    }

    /**
     * DELETE /organizations/:organization_id/addresses/:address_id
     * Deletes an address.
     *
     * @param c - Hono request context; expects an `address_id` route param.
     * @returns JSON response with the deleted address.
     * @throws {HTTPException} 400 if the `address_id` param is missing.
     * @throws {HTTPException} 404 if no address matches the given id.
     */
    delete = async (c: Context) => {
        const addressId = c.req.param('address_id');

        if (!addressId) {
            throw new HTTPException(400, { message: "Missing Parameters: addressId" });
        }

        logger.info({ addressId }, `${this.constructor.name}.${this.delete.name}: Deleting address`);

        const address = await this.addressService.delete(addressId);

        if (!address) {
            logger.warn({ addressId }, `${this.constructor.name}.${this.delete.name}: Address not found`);
            throw new HTTPException(404, { message: "Address not found" });
        }

        logger.info({ addressId }, `${this.constructor.name}.${this.delete.name}: Address deleted successfully`);

        return c.json(address);
    }
}

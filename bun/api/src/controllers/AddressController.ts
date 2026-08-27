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
     * a single user, an optional `is_primary` query param to filter by the
     * primary-address flag, and optional `limit` (max rows to return) and
     * `offset` (rows to skip before returning results) query params.
     * @returns JSON array of addresses.
     * @throws {HTTPException} 400 if the `organization_id` param is missing.
     */
    getAll = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);

        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        const userId = c.req.query('user_id');
        const isPrimaryParam = c.req.query('is_primary');
        const isPrimary = isPrimaryParam === undefined ? undefined : isPrimaryParam === 'true';
        const limitParam = c.req.query('limit');
        const offsetParam = c.req.query('offset');
        const limit = limitParam !== undefined ? Number(limitParam) : undefined;
        const offset = offsetParam !== undefined ? Number(offsetParam) : undefined;

        logger.debug({ organizationId, userId, isPrimary, limit, offset }, `Request:`);

        const addresses = userId
            ? await this.addressService.getByUser(userId, { limit, offset })
            : await this.addressService.getByOrganization(organizationId, { isPrimary, limit, offset });

        logger.debug({ organizationId, count: addresses.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

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
        logger.info(`Start method: ${this.constructor.name}.${this.post.name}`);

        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        const body = await c.req.json();

        logger.debug({ organizationId, body }, `Request:`);

        const address = await this.addressService.create({ ...body, organization_id: organizationId });

        logger.debug({ organizationId, address }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.post.name}`);

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
        logger.info(`Start method: ${this.constructor.name}.${this.get.name}`);

        const addressId = c.req.param('address_id');

        if (!addressId) {
            throw new HTTPException(400, { message: "Missing Parameters: addressId" });
        }

        logger.debug({ addressId }, `Request:`);

        const address = await this.addressService.getById(addressId);

        if (!address) {
            logger.warn({ addressId }, `${this.constructor.name}.${this.get.name}: Address not found`);
            throw new HTTPException(404, { message: "Address not found" });
        }

        logger.debug({ address }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.get.name}`);

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
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);

        const addressId = c.req.param('address_id');

        if (!addressId) {
            throw new HTTPException(400, { message: "Missing Parameters: addressId" });
        }

        const body = await c.req.json();

        logger.debug({ addressId, body }, `Request:`);

        const address = await this.addressService.update(addressId, body);

        if (!address) {
            logger.warn({ addressId }, `${this.constructor.name}.${this.update.name}: Address not found`);
            throw new HTTPException(404, { message: "Address not found" });
        }

        logger.debug({ address }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

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
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);

        const addressId = c.req.param('address_id');

        if (!addressId) {
            throw new HTTPException(400, { message: "Missing Parameters: addressId" });
        }

        logger.debug({ addressId }, `Request:`);

        const address = await this.addressService.delete(addressId);

        if (!address) {
            logger.warn({ addressId }, `${this.constructor.name}.${this.delete.name}: Address not found`);
            throw new HTTPException(404, { message: "Address not found" });
        }

        logger.debug({ address }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

        return c.json(address);
    }
}

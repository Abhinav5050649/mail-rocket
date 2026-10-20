import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../libs";
import { AddressService, OrganizationService } from "../services";

/**
 * HTTP layer for address-related endpoints. Translates Hono `Context`
 * objects into `AddressService` calls and maps the results to HTTP
 * responses/errors. Addresses live at `/addresses` and always
 * belong to the instance's single organization.
 */
export class AddressController {
    constructor(private addressService: AddressService, private organizationService: OrganizationService) {
    }

    /**
     * Resolves the id of the instance's single organization, which every
     * address row is linked to.
     *
     * @returns The organization's id.
     * @throws {HTTPException} 404 if the organization hasn't been seeded (boot didn't complete).
     */
    private organizationId = async () => {
        const organization = await this.organizationService.get();

        if (!organization) {
            throw new HTTPException(404, { message: "Organization not found" });
        }

        return organization.id;
    }

    /**
     * GET /addresses
     * Lists addresses belonging to the organization.
     *
     * @param c - Hono request context; accepts an optional `is_primary` query param to filter by the
     * primary-address flag, and optional `limit` (max rows to return) and
     * `offset` (rows to skip before returning results) query params.
     * @returns JSON array of addresses.
     * @throws {HTTPException} 404 if the organization hasn't been seeded.
     */
    getAll = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);

        const organizationId = await this.organizationId();

        const isPrimaryParam = c.req.query('is_primary');
        const isPrimary = isPrimaryParam === undefined ? undefined : isPrimaryParam === 'true';
        const limitParam = c.req.query('limit');
        const offsetParam = c.req.query('offset');
        const limit = limitParam !== undefined ? Number(limitParam) : undefined;
        const offset = offsetParam !== undefined ? Number(offsetParam) : undefined;

        logger.debug({ organizationId, isPrimary, limit, offset }, `Request:`);

        const addresses = await this.addressService.getByOrganization(organizationId, { isPrimary, limit, offset });

        logger.debug({ organizationId, count: addresses.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

        return c.json(addresses);
    }

    /**
     * POST /addresses
     * Creates a new address.
     *
     * @param c - Hono request context; expects a JSON body with the address fields.
     * @returns JSON response with the created address.
     * @throws {HTTPException} 404 if the organization hasn't been seeded.
     */
    post = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.post.name}`);

        const organizationId = await this.organizationId();

        const body = await c.req.json();

        logger.debug({ organizationId, body }, `Request:`);

        const address = await this.addressService.create({ ...body, organization_id: organizationId });

        logger.debug({ organizationId, address }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.post.name}`);

        return c.json(address, 201);
    }

    /**
     * GET /addresses/:address_id
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
     * PATCH /addresses/:address_id
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
     * DELETE /addresses/:address_id
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

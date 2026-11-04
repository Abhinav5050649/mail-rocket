import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../libs";
import { ContactDetailsService, OrganizationService } from "../services";

/**
 * HTTP layer for contact-details endpoints. Translates Hono `Context`
 * objects into `ContactDetailsService` calls and maps the results to HTTP
 * responses/errors. Contact details live at `/contact-details` and always
 * belong to the instance's single organization.
 */
export class ContactDetailsController {
    constructor(private contactDetailsService: ContactDetailsService, private organizationService: OrganizationService) {
    }

    /**
     * Resolves the id of the instance's single organization, which every
     * contact-details row is linked to.
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
     * GET /contact-details
     * Lists contact details belonging to the organization.
     *
     * @param c - Hono request context; accepts optional `limit` (max rows to return) and `offset`
     * (rows to skip before returning results) query params.
     * @returns JSON array of contact-details rows.
     * @throws {HTTPException} 404 if the organization hasn't been seeded.
     */
    getAll = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);

        const organizationId = await this.organizationId();

        const limitParam = c.req.query('limit');
        const offsetParam = c.req.query('offset');
        const limit = limitParam !== undefined ? Number(limitParam) : undefined;
        const offset = offsetParam !== undefined ? Number(offsetParam) : undefined;

        logger.debug({ organizationId, limit, offset }, `Request:`);

        const contactDetails = await this.contactDetailsService.getByOrganization(organizationId, { limit, offset });

        logger.debug({ organizationId, count: contactDetails.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

        return c.json(contactDetails);
    }

    /**
     * POST /contact-details
     * Creates a new contact-details row.
     *
     * @param c - Hono request context; expects a JSON body with the contact-details fields.
     * @returns JSON response with the created contact-details row.
     * @throws {HTTPException} 404 if the organization hasn't been seeded.
     */
    post = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.post.name}`);

        const organizationId = await this.organizationId();

        const body = await c.req.json();

        logger.debug({ organizationId, body }, `Request:`);

        const contactDetails = await this.contactDetailsService.create({ ...body, organization_id: organizationId });

        logger.debug({ organizationId, contactDetails }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.post.name}`);

        return c.json(contactDetails, 201);
    }

    /**
     * GET /contact-details/:contact_details_id
     * Fetches a single contact-details row by id.
     *
     * @param c - Hono request context; expects a `contact_details_id` route param.
     * @returns JSON response with the contact-details document.
     * @throws {HTTPException} 400 if the `contact_details_id` param is missing.
     * @throws {HTTPException} 404 if no contact-details row matches the given id.
     */
    get = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.get.name}`);

        const contactDetailsId = c.req.param('contact_details_id');

        if (!contactDetailsId) {
            throw new HTTPException(400, { message: "Missing Parameters: contactDetailsId" });
        }

        logger.debug({ contactDetailsId }, `Request:`);

        const contactDetails = await this.contactDetailsService.getById(contactDetailsId);

        if (!contactDetails) {
            logger.warn({ contactDetailsId }, `${this.constructor.name}.${this.get.name}: Contact details not found`);
            throw new HTTPException(404, { message: "Contact details not found" });
        }

        logger.debug({ contactDetails }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.get.name}`);

        return c.json(contactDetails);
    }

    /**
     * PATCH /contact-details/:contact_details_id
     * Partially updates a contact-details row.
     *
     * @param c - Hono request context; expects a `contact_details_id` route
     * param and a JSON body with the fields to update.
     * @returns JSON response with the updated contact-details row.
     * @throws {HTTPException} 400 if the `contact_details_id` param is missing.
     * @throws {HTTPException} 404 if no contact-details row matches the given id.
     */
    update = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);

        const contactDetailsId = c.req.param('contact_details_id');

        if (!contactDetailsId) {
            throw new HTTPException(400, { message: "Missing Parameters: contactDetailsId" });
        }

        const body = await c.req.json();

        logger.debug({ contactDetailsId, body }, `Request:`);

        const contactDetails = await this.contactDetailsService.update(contactDetailsId, body);

        if (!contactDetails) {
            logger.warn({ contactDetailsId }, `${this.constructor.name}.${this.update.name}: Contact details not found`);
            throw new HTTPException(404, { message: "Contact details not found" });
        }

        logger.debug({ contactDetails }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

        return c.json(contactDetails);
    }

    /**
     * DELETE /contact-details/:contact_details_id
     * Deletes a contact-details row.
     *
     * @param c - Hono request context; expects a `contact_details_id` route param.
     * @returns JSON response with the deleted contact-details row.
     * @throws {HTTPException} 400 if the `contact_details_id` param is missing.
     * @throws {HTTPException} 404 if no contact-details row matches the given id.
     */
    delete = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);

        const contactDetailsId = c.req.param('contact_details_id');

        if (!contactDetailsId) {
            throw new HTTPException(400, { message: "Missing Parameters: contactDetailsId" });
        }

        logger.debug({ contactDetailsId }, `Request:`);

        const contactDetails = await this.contactDetailsService.delete(contactDetailsId);

        if (!contactDetails) {
            logger.warn({ contactDetailsId }, `${this.constructor.name}.${this.delete.name}: Contact details not found`);
            throw new HTTPException(404, { message: "Contact details not found" });
        }

        logger.debug({ contactDetails }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

        return c.json(contactDetails);
    }
}

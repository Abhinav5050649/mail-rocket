import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../libs";
import { ContactDetailsService } from "../services";

/**
 * HTTP layer for contact-details endpoints. Translates Hono `Context`
 * objects into `ContactDetailsService` calls and maps the results to HTTP
 * responses/errors. Contact details are nested under an organization:
 * `/organizations/:organization_id/contact-details`.
 */
export class ContactDetailsController {
    constructor(private contactDetailsService: ContactDetailsService) {
    }

    /**
     * GET /organizations/:organization_id/contact-details
     * Lists contact details belonging to an organization.
     *
     * @param c - Hono request context; expects an `organization_id` route
     * param. Accepts an optional `user_id` query param to scope the list to
     * a single user, and optional `count`/`page_token` query params for
     * pagination (max rows / offset).
     * @returns JSON array of matching contact details.
     * @throws {HTTPException} 400 if the `organization_id` param is missing.
     */
    getAll = async (c: Context) => {
        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        const userId = c.req.query('user_id');
        const count = c.req.query('count');
        const pageToken = c.req.query('page_token');

        logger.info({ organizationId, userId, count, pageToken }, `${this.constructor.name}.${this.getAll.name}: Fetching contact details`);

        const contactDetails = userId
            ? await this.contactDetailsService.getByUser(userId)
            : await this.contactDetailsService.getByOrganization(organizationId, {
                limit: count !== undefined ? Number(count) : undefined,
                offset: pageToken !== undefined ? Number(pageToken) : undefined,
            });

        logger.info({ organizationId, count: contactDetails.length }, `${this.constructor.name}.${this.getAll.name}: Contact details fetched successfully`);

        return c.json(contactDetails);
    }

    /**
     * POST /organizations/:organization_id/contact-details
     * Creates a new contact-details row within an organization.
     *
     * @param c - Hono request context; expects an `organization_id` route
     * param and a JSON body with the contact-details fields.
     * @returns JSON response with the created contact-details row.
     * @throws {HTTPException} 400 if the `organization_id` param is missing.
     */
    post = async (c: Context) => {
        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        const body = await c.req.json();

        logger.info({ organizationId, body }, `${this.constructor.name}.${this.post.name}: Creating contact details`);

        const contactDetails = await this.contactDetailsService.create({ ...body, organization_id: organizationId });

        logger.info({ organizationId, contactDetailsId: contactDetails.id }, `${this.constructor.name}.${this.post.name}: Contact details created successfully`);

        return c.json(contactDetails, 201);
    }

    /**
     * GET /organizations/:organization_id/contact-details/:contact_details_id
     * Fetches a single contact-details row by id.
     *
     * @param c - Hono request context; expects a `contact_details_id` route param.
     * @returns JSON response with the contact-details document.
     * @throws {HTTPException} 400 if the `contact_details_id` param is missing.
     * @throws {HTTPException} 404 if no contact-details row matches the given id.
     */
    get = async (c: Context) => {
        const contactDetailsId = c.req.param('contact_details_id');

        if (!contactDetailsId) {
            throw new HTTPException(400, { message: "Missing Parameters: contactDetailsId" });
        }

        logger.info({ contactDetailsId }, `${this.constructor.name}.${this.get.name}: Fetching contact details`);

        const contactDetails = await this.contactDetailsService.getById(contactDetailsId);

        if (!contactDetails) {
            logger.warn({ contactDetailsId }, `${this.constructor.name}.${this.get.name}: Contact details not found`);
            throw new HTTPException(404, { message: "Contact details not found" });
        }

        logger.info({ contactDetailsId }, `${this.constructor.name}.${this.get.name}: Contact details fetched successfully`);

        return c.json(contactDetails);
    }

    /**
     * PATCH /organizations/:organization_id/contact-details/:contact_details_id
     * Partially updates a contact-details row.
     *
     * @param c - Hono request context; expects a `contact_details_id` route
     * param and a JSON body with the fields to update.
     * @returns JSON response with the updated contact-details row.
     * @throws {HTTPException} 400 if the `contact_details_id` param is missing.
     * @throws {HTTPException} 404 if no contact-details row matches the given id.
     */
    update = async (c: Context) => {
        const contactDetailsId = c.req.param('contact_details_id');

        if (!contactDetailsId) {
            throw new HTTPException(400, { message: "Missing Parameters: contactDetailsId" });
        }

        const body = await c.req.json();

        logger.info({ contactDetailsId, body }, `${this.constructor.name}.${this.update.name}: Updating contact details`);

        const contactDetails = await this.contactDetailsService.update(contactDetailsId, body);

        if (!contactDetails) {
            logger.warn({ contactDetailsId }, `${this.constructor.name}.${this.update.name}: Contact details not found`);
            throw new HTTPException(404, { message: "Contact details not found" });
        }

        logger.info({ contactDetailsId }, `${this.constructor.name}.${this.update.name}: Contact details updated successfully`);

        return c.json(contactDetails);
    }

    /**
     * DELETE /organizations/:organization_id/contact-details/:contact_details_id
     * Deletes a contact-details row.
     *
     * @param c - Hono request context; expects a `contact_details_id` route param.
     * @returns JSON response with the deleted contact-details row.
     * @throws {HTTPException} 400 if the `contact_details_id` param is missing.
     * @throws {HTTPException} 404 if no contact-details row matches the given id.
     */
    delete = async (c: Context) => {
        const contactDetailsId = c.req.param('contact_details_id');

        if (!contactDetailsId) {
            throw new HTTPException(400, { message: "Missing Parameters: contactDetailsId" });
        }

        logger.info({ contactDetailsId }, `${this.constructor.name}.${this.delete.name}: Deleting contact details`);

        const contactDetails = await this.contactDetailsService.delete(contactDetailsId);

        if (!contactDetails) {
            logger.warn({ contactDetailsId }, `${this.constructor.name}.${this.delete.name}: Contact details not found`);
            throw new HTTPException(404, { message: "Contact details not found" });
        }

        logger.info({ contactDetailsId }, `${this.constructor.name}.${this.delete.name}: Contact details deleted successfully`);

        return c.json(contactDetails);
    }
}

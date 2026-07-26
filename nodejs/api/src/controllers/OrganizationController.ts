import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger, DEFAULT_PAGE_SIZE, decodePageToken, buildPage } from "../libs";
import { OrganizationService } from "../services";

/**
 * HTTP layer for organization-related endpoints. Translates Hono `Context`
 * objects into `OrganizationService` calls and maps the results to HTTP
 * responses/errors.
 */
export class OrganizationController {
    constructor(private organizationService: OrganizationService) {
    }

    /**
     * GET /organizations
     * Lists organizations.
     *
     * @param c - Hono request context; accepts optional `count` (max rows
     * to return, defaults to {@link DEFAULT_PAGE_SIZE}) and `page_token`
     * (the base64-encoded `next_page_token` from the previous response)
     * query params.
     * @returns JSON `{ data, next_page_token }` - `next_page_token` is
     * `null` once the last page has been reached.
     */
    getAll = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);

        const countParam = c.req.query('count');
        const pageTokenParam = c.req.query('page_token');
        const count = countParam !== undefined ? Number(countParam) : DEFAULT_PAGE_SIZE;
        const pageToken = pageTokenParam ? decodePageToken(pageTokenParam) : undefined;

        logger.debug({ count, pageToken }, `Request:`);

        const organizations = await this.organizationService.getAll({ count, pageToken });

        logger.debug({ count: organizations.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

        return c.json(buildPage(organizations, count));
    }

    /**
     * POST /organizations
     * Creates a new organization.
     *
     * @param c - Hono request context; expects a JSON body with the
     * organization fields.
     * @returns JSON response with the created organization.
     */
    post = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.post.name}`);

        const body = await c.req.json();

        logger.debug({ body }, `Request:`);

        const organization = await this.organizationService.create(body);

        logger.debug({ organization }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.post.name}`);

        return c.json(organization, 201);
    }

    /**
     * GET /organizations/:organization_id
     * Fetches a single organization by id.
     *
     * @param c - Hono request context; expects an `organization_id` route param.
     * @returns JSON response with the organization document.
     * @throws {HTTPException} 400 if the `organization_id` param is missing.
     * @throws {HTTPException} 404 if no organization matches the given id.
     */
    get = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.get.name}`);

        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        logger.debug({ organizationId }, `Request:`);

        const organization = await this.organizationService.getById(organizationId);

        if (!organization) {
            logger.warn({ organizationId }, `${this.constructor.name}.${this.get.name}: Organization not found`);
            throw new HTTPException(404, { message: "Organization not found" });
        }

        logger.debug({ organization }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.get.name}`);

        return c.json(organization);
    }

    /**
     * PATCH /organizations/:organization_id
     * Partially updates an organization.
     *
     * @param c - Hono request context; expects an `organization_id` route
     * param and a JSON body with the fields to update.
     * @returns JSON response with the updated organization.
     * @throws {HTTPException} 400 if the `organization_id` param is missing.
     * @throws {HTTPException} 404 if no organization matches the given id.
     */
    update = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);

        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        const body = await c.req.json();

        logger.debug({ organizationId, body }, `Request:`);

        const organization = await this.organizationService.update(organizationId, body);

        if (!organization) {
            logger.warn({ organizationId }, `${this.constructor.name}.${this.update.name}: Organization not found`);
            throw new HTTPException(404, { message: "Organization not found" });
        }

        logger.debug({ organization }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

        return c.json(organization);
    }

    /**
     * DELETE /organizations/:organization_id
     * Deletes an organization.
     *
     * @param c - Hono request context; expects an `organization_id` route param.
     * @returns JSON response with the deleted organization.
     * @throws {HTTPException} 400 if the `organization_id` param is missing.
     * @throws {HTTPException} 404 if no organization matches the given id.
     */
    delete = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);

        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        logger.debug({ organizationId }, `Request:`);

        const organization = await this.organizationService.delete(organizationId);

        if (!organization) {
            logger.warn({ organizationId }, `${this.constructor.name}.${this.delete.name}: Organization not found`);
            throw new HTTPException(404, { message: "Organization not found" });
        }

        logger.debug({ organization }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

        return c.json(organization);
    }
}

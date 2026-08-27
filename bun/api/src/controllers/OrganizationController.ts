import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../libs";
import { OrganizationService, OrganizationUserService } from "../services";

/**
 * HTTP layer for organization-related endpoints. Translates Hono `Context`
 * objects into `OrganizationService` calls and maps the results to HTTP
 * responses/errors. Only an `admin` may write to these endpoints (enforced
 * by `requireRole('admin')` in `OrganizationRoute`), except `POST /` itself -
 * there's no organization yet to hold a role in, so creating one just
 * requires being authenticated; the creator is then made that org's first
 * `admin` automatically (see `post` below), which is what lets them manage
 * it afterwards.
 */
export class OrganizationController {
    constructor(private organizationService: OrganizationService, private organizationUserService: OrganizationUserService) {
    }

    /**
     * GET /organizations
     * Lists organizations.
     *
     * @param c - Hono request context; accepts optional `limit` (max rows
     * to return) and `offset` (rows to skip before returning results)
     * query params.
     * @returns JSON array of organizations.
     */
    getAll = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);

        const limitParam = c.req.query('limit');
        const offsetParam = c.req.query('offset');
        const limit = limitParam !== undefined ? Number(limitParam) : undefined;
        const offset = offsetParam !== undefined ? Number(offsetParam) : undefined;

        logger.debug({ limit, offset }, `Request:`);

        const organizations = await this.organizationService.getAll({ limit, offset });

        logger.debug({ count: organizations.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

        return c.json(organizations);
    }

    /**
     * POST /organizations
     * Creates a new organization and makes the authenticated caller its
     * first `admin` member - without this, a freshly created organization
     * would have nobody able to manage it (every write to `/organizations`
     * and `/organizations/:organization_id/users` requires `admin`).
     *
     * @param c - Hono request context; expects a JSON body with the
     * organization fields.
     * @returns JSON response with the created organization.
     */
    post = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.post.name}`);

        const body = await c.req.json();
        const userId = c.get('userId');

        logger.debug({ body, userId }, `Request:`);

        const organization = await this.organizationService.create(body);
        await this.organizationUserService.create({ organization_id: organization.id, user_id: userId, role: "admin" });

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

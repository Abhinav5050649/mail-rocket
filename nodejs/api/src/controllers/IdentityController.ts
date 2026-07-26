import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger, DEFAULT_PAGE_SIZE, decodePageToken, buildPage } from "../libs";
import { IdentityService } from "../services";
import type { IdentityType, IdentityStatus } from "../models";

/**
 * HTTP layer for identity-related endpoints. Translates Hono `Context`
 * objects into `IdentityService` calls and maps the results to HTTP
 * responses/errors. Identities are nested under an organization:
 * `/organizations/:organization_id/identities`.
 */
export class IdentityController {
    constructor(private identityService: IdentityService) {
    }

    /**
     * GET /organizations/:organization_id/identities
     * Lists identities belonging to an organization.
     *
     * @param c - Hono request context; expects an `organization_id` route
     * param. Accepts optional `type` and `status` filters, and optional
     * `count` (max rows to return, defaults to {@link DEFAULT_PAGE_SIZE})
     * and `page_token` (the base64-encoded `next_page_token` from the
     * previous response) query params.
     * @returns JSON `{ data, next_page_token }` - `next_page_token` is
     * `null` once the last page has been reached.
     * @throws {HTTPException} 400 if the `organization_id` param is missing.
     */
    getAll = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);

        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        const type = c.req.query('type') as IdentityType | undefined;
        const status = c.req.query('status') as IdentityStatus | undefined;
        const countParam = c.req.query('count');
        const pageTokenParam = c.req.query('page_token');
        const count = countParam !== undefined ? Number(countParam) : DEFAULT_PAGE_SIZE;
        const pageToken = pageTokenParam ? decodePageToken(pageTokenParam) : undefined;

        logger.debug({ organizationId, type, status, count, pageToken }, `Request:`);

        const identities = await this.identityService.getByOrganization(organizationId, { type, status, count, pageToken });

        logger.debug({ organizationId, count: identities.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

        return c.json(buildPage(identities, count));
    }

    /**
     * POST /organizations/:organization_id/identities
     * Creates a new identity within an organization.
     *
     * @param c - Hono request context; expects an `organization_id` route
     * param and a JSON body with the identity fields.
     * @returns JSON response with the created identity.
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

        const identity = await this.identityService.create({ ...body, organization_id: organizationId });

        logger.debug({ organizationId, identity }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.post.name}`);

        return c.json(identity, 201);
    }

    /**
     * GET /organizations/:organization_id/identities/:identity_id
     * Fetches a single identity by id.
     *
     * @param c - Hono request context; expects an `identity_id` route param.
     * @returns JSON response with the identity document.
     * @throws {HTTPException} 400 if the `identity_id` param is missing.
     * @throws {HTTPException} 404 if no identity matches the given id.
     */
    get = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.get.name}`);

        const identityId = c.req.param('identity_id');

        if (!identityId) {
            throw new HTTPException(400, { message: "Missing Parameters: identityId" });
        }

        logger.debug({ identityId }, `Request:`);

        const identity = await this.identityService.getById(identityId);

        if (!identity) {
            logger.warn({ identityId }, `${this.constructor.name}.${this.get.name}: Identity not found`);
            throw new HTTPException(404, { message: "Identity not found" });
        }

        logger.debug({ identity }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.get.name}`);

        return c.json(identity);
    }

    /**
     * PATCH /organizations/:organization_id/identities/:identity_id
     * Partially updates an identity.
     *
     * @param c - Hono request context; expects an `identity_id` route
     * param and a JSON body with the fields to update.
     * @returns JSON response with the updated identity.
     * @throws {HTTPException} 400 if the `identity_id` param is missing.
     * @throws {HTTPException} 404 if no identity matches the given id.
     */
    update = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);

        const identityId = c.req.param('identity_id');

        if (!identityId) {
            throw new HTTPException(400, { message: "Missing Parameters: identityId" });
        }

        const body = await c.req.json();

        logger.debug({ identityId, body }, `Request:`);

        const identity = await this.identityService.update(identityId, body);

        if (!identity) {
            logger.warn({ identityId }, `${this.constructor.name}.${this.update.name}: Identity not found`);
            throw new HTTPException(404, { message: "Identity not found" });
        }

        logger.debug({ identity }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

        return c.json(identity);
    }

    /**
     * DELETE /organizations/:organization_id/identities/:identity_id
     * Deletes an identity.
     *
     * @param c - Hono request context; expects an `identity_id` route param.
     * @returns JSON response with the deleted identity.
     * @throws {HTTPException} 400 if the `identity_id` param is missing.
     * @throws {HTTPException} 404 if no identity matches the given id.
     */
    delete = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);

        const identityId = c.req.param('identity_id');

        if (!identityId) {
            throw new HTTPException(400, { message: "Missing Parameters: identityId" });
        }

        logger.debug({ identityId }, `Request:`);

        const identity = await this.identityService.delete(identityId);

        if (!identity) {
            logger.warn({ identityId }, `${this.constructor.name}.${this.delete.name}: Identity not found`);
            throw new HTTPException(404, { message: "Identity not found" });
        }

        logger.debug({ identity }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

        return c.json(identity);
    }
}

import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { assertNoSystemFields, logger } from "../libs";
import { IdentityService } from "../services";
import type { IdentityType, IdentityStatus } from "../models";

/**
 * HTTP layer for identity-related endpoints. Translates Hono `Context`
 * objects into `IdentityService` calls and maps the results to HTTP
 * responses/errors. Identities live at `/identities`.
 */
export class IdentityController {
    constructor(private identityService: IdentityService) {
    }

    /**
     * GET /identities
     * Lists all identities.
     *
     * @param c - Hono request context; accepts optional `type` and `status` filters, and optional
     * `limit` (max rows to return) and `offset` (rows to skip before
     * returning results) query params.
     * @returns JSON array of identities.
     */
    getAll = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);

        const type = c.req.query('type') as IdentityType | undefined;
        const status = c.req.query('status') as IdentityStatus | undefined;
        const limitParam = c.req.query('limit');
        const offsetParam = c.req.query('offset');
        const limit = limitParam !== undefined ? Number(limitParam) : undefined;
        const offset = offsetParam !== undefined ? Number(offsetParam) : undefined;

        logger.debug({ type, status, limit, offset }, `Request:`);

        const identities = await this.identityService.getAll({ type, status, limit, offset });

        logger.debug({ count: identities.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

        return c.json(identities);
    }

    /**
     * POST /identities
     * Creates a new identity.
     *
     * @param c - Hono request context; expects a JSON body with the identity fields.
     * @returns JSON response with the created identity.
     * @throws {ValidationError} 400 if the body sets `status` or `verification_records`.
     */
    post = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.post.name}`);

        const body = await c.req.json();
        assertNoSystemFields(body, ["status", "verification_records"], "An identity becomes active once AWS SES verifies it.");

        logger.debug({ body }, `Request:`);

        const identity = await this.identityService.create(body);

        logger.debug({ identity }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.post.name}`);

        return c.json(identity, 201);
    }

    /**
     * GET /identities/:identity_id
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
     * PATCH /identities/:identity_id
     * Partially updates an identity.
     *
     * @param c - Hono request context; expects an `identity_id` route
     * param and a JSON body with the fields to update.
     * @returns JSON response with the updated identity.
     * @throws {HTTPException} 400 if the `identity_id` param is missing.
     * @throws {ValidationError} 400 if the body sets anything but `description`.
     * @throws {HTTPException} 404 if no identity matches the given id.
     */
    update = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);

        const identityId = c.req.param('identity_id');

        if (!identityId) {
            throw new HTTPException(400, { message: "Missing Parameters: identityId" });
        }

        const body = await c.req.json();
        // Only `description` is editable: changing `type`/`identity` would keep an "active" status for an address SES never verified.
        assertNoSystemFields(body, ["status", "verification_records", "type", "identity"], "Create a new identity to send from a different address; only description can be updated.");

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
     * DELETE /identities/:identity_id
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

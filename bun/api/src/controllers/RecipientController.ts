import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger, ValidationError } from "../libs";
import { RecipientService } from "../services";

/**
 * Checks a recipient body's group membership fields. `group_ids`, when
 * present, must be an array of id strings; the old single `group_id` is
 * rejected with a pointer to its replacement rather than silently ignored.
 *
 * @param body - The parsed JSON request body.
 * @throws {ValidationError} (-> 400) on `group_id` or a malformed `group_ids`.
 */
const assertGroupIdsField = (body: Record<string, unknown>): void => {
    if ("group_id" in body) {
        throw new ValidationError("group_id was replaced by group_ids: a recipient can be in several groups. Send group_ids: [\"<group id>\"] instead.");
    }
    if ("group_ids" in body && (!Array.isArray(body.group_ids) || !body.group_ids.every((id) => typeof id === "string" && id.length > 0))) {
        throw new ValidationError("group_ids must be an array of group id strings");
    }
};

/**
 * HTTP layer for recipient-related endpoints. Translates Hono `Context`
 * objects into `RecipientService` calls and maps the results to HTTP
 * responses/errors. Recipients live at `/recipients`, and are
 * additionally nested under a campaign
 * (`/campaigns/:campaign_id/recipients`) or a
 * group within a campaign
 * (`/campaigns/:campaign_id/groups/:group_id/recipients`)
 * for narrower listing/creation. Group membership is many-to-many and is
 * managed at `/groups/:group_id/recipients`, or by sending `group_ids`.
 */
export class RecipientController {
    constructor(private recipientService: RecipientService) {
    }

    /**
     * GET /recipients
     * Lists every recipient, across all campaigns and groups.
     *
     * @param c - Hono request context; accepts optional `limit` (max rows to return) and `offset`
     * (rows to skip before returning results) query params.
     * @returns JSON array of recipients.
     */
    getAll = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);

        const limitParam = c.req.query('limit');
        const offsetParam = c.req.query('offset');
        const limit = limitParam !== undefined ? Number(limitParam) : undefined;
        const offset = offsetParam !== undefined ? Number(offsetParam) : undefined;

        logger.debug({ limit, offset }, `Request:`);

        const recipients = await this.recipientService.getAll({ limit, offset });

        logger.debug({ count: recipients.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

        return c.json(recipients);
    }

    /**
     * POST /recipients
     * Creates a new recipient.
     *
     * @param c - Hono request context; expects a JSON body with the recipient fields.
     * @returns JSON response with the created recipient.
     */
    post = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.post.name}`);

        const body = await c.req.json();
        assertGroupIdsField(body);

        logger.debug({ body }, `Request:`);

        const recipient = await this.recipientService.create(body);

        logger.debug({ recipient }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.post.name}`);

        return c.json(recipient, 201);
    }

    /**
     * GET /campaigns/:campaign_id/recipients
     * Lists a campaign's audience: recipients linked to it directly plus
     * members of its linked groups, each once.
     *
     * @param c - Hono request context; expects a `campaign_id` route param.
     * Accepts optional `limit` (max rows to return) and `offset` (rows to
     * skip before returning results) query params.
     * @returns JSON array of recipients.
     * @throws {HTTPException} 400 if the `campaign_id` param is missing.
     */
    getAllByCampaign = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.getAllByCampaign.name}`);

        const campaignId = c.req.param('campaign_id');

        if (!campaignId) {
            throw new HTTPException(400, { message: "Missing Parameters: campaignId" });
        }

        const limitParam = c.req.query('limit');
        const offsetParam = c.req.query('offset');
        const limit = limitParam !== undefined ? Number(limitParam) : undefined;
        const offset = offsetParam !== undefined ? Number(offsetParam) : undefined;

        logger.debug({ campaignId, limit, offset }, `Request:`);

        const recipients = await this.recipientService.getByCampaign(campaignId, { limit, offset });

        logger.debug({ campaignId, count: recipients.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAllByCampaign.name}`);

        return c.json(recipients);
    }

    /**
     * POST /campaigns/:campaign_id/recipients
     * Creates a new recipient within a campaign.
     *
     * @param c - Hono request context; expects a `campaign_id`
     * route param and a JSON body with the recipient fields.
     * @returns JSON response with the created recipient.
     * @throws {HTTPException} 400 if the `campaign_id` param is missing.
     */
    postByCampaign = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.postByCampaign.name}`);

        const campaignId = c.req.param('campaign_id');

        if (!campaignId) {
            throw new HTTPException(400, { message: "Missing Parameters: campaignId" });
        }

        const body = await c.req.json();
        assertGroupIdsField(body);

        logger.debug({ campaignId, body }, `Request:`);

        const recipient = await this.recipientService.create({ ...body, campaign_id: campaignId });

        logger.debug({ campaignId, recipient }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.postByCampaign.name}`);

        return c.json(recipient, 201);
    }

    /**
     * GET /groups/:group_id/recipients
     * GET /campaigns/:campaign_id/groups/:group_id/recipients
     * Lists recipients belonging to a single group.
     *
     * @param c - Hono request context; expects a `group_id` route param.
     * Accepts optional `limit` (max rows to return) and `offset` (rows to
     * skip before returning results) query params.
     * @returns JSON array of recipients.
     * @throws {HTTPException} 400 if the `group_id` param is missing.
     */
    getAllByGroup = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.getAllByGroup.name}`);

        const groupId = c.req.param('group_id');

        if (!groupId) {
            throw new HTTPException(400, { message: "Missing Parameters: groupId" });
        }

        const limitParam = c.req.query('limit');
        const offsetParam = c.req.query('offset');
        const limit = limitParam !== undefined ? Number(limitParam) : undefined;
        const offset = offsetParam !== undefined ? Number(offsetParam) : undefined;

        logger.debug({ groupId, limit, offset }, `Request:`);

        const recipients = await this.recipientService.getByGroup(groupId, { limit, offset });

        logger.debug({ groupId, count: recipients.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAllByGroup.name}`);

        return c.json(recipients);
    }

    /**
     * POST /campaigns/:campaign_id/groups/:group_id/recipients
     * Creates a new recipient within a group.
     *
     * @param c - Hono request context; expects `campaign_id` and
     * `group_id` route params and a JSON body with the
     * recipient fields.
     * @returns JSON response with the created recipient.
     * @throws {HTTPException} 400 if `campaign_id` or `group_id` is missing.
     */
    postByGroup = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.postByGroup.name}`);

        const campaignId = c.req.param('campaign_id');
        const groupId = c.req.param('group_id');

        if (!campaignId || !groupId) {
            throw new HTTPException(400, { message: "Missing Parameters: campaignId, groupId" });
        }

        const body = await c.req.json();
        assertGroupIdsField(body);

        logger.debug({ campaignId, groupId, body }, `Request:`);

        // The route's group is always one of the new recipient's groups.
        const recipient = await this.recipientService.create({
            ...body,
            campaign_id: campaignId,
            group_ids: [...new Set([...(body.group_ids ?? []), groupId])],
        });

        logger.debug({ campaignId, groupId, recipient }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.postByGroup.name}`);

        return c.json(recipient, 201);
    }

    /**
     * GET /recipients/:recipient_id
     * Fetches a single recipient by id.
     *
     * @param c - Hono request context; expects a `recipient_id` route param.
     * @returns JSON response with the recipient document.
     * @throws {HTTPException} 400 if the `recipient_id` param is missing.
     * @throws {HTTPException} 404 if no recipient matches the given id.
     */
    get = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.get.name}`);

        const recipientId = c.req.param('recipient_id');

        if (!recipientId) {
            throw new HTTPException(400, { message: "Missing Parameters: recipientId" });
        }

        logger.debug({ recipientId }, `Request:`);

        const recipient = await this.recipientService.getById(recipientId);

        if (!recipient) {
            logger.warn({ recipientId }, `${this.constructor.name}.${this.get.name}: Recipient not found`);
            throw new HTTPException(404, { message: "Recipient not found" });
        }

        logger.debug({ recipient }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.get.name}`);

        return c.json(recipient);
    }

    /**
     * PATCH /recipients/:recipient_id
     * Partially updates a recipient.
     *
     * @param c - Hono request context; expects a `recipient_id` route param
     * and a JSON body with the fields to update.
     * @returns JSON response with the updated recipient.
     * @throws {HTTPException} 400 if the `recipient_id` param is missing.
     * @throws {HTTPException} 404 if no recipient matches the given id.
     */
    update = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);

        const recipientId = c.req.param('recipient_id');

        if (!recipientId) {
            throw new HTTPException(400, { message: "Missing Parameters: recipientId" });
        }

        const body = await c.req.json();
        assertGroupIdsField(body);

        logger.debug({ recipientId, body }, `Request:`);

        const recipient = await this.recipientService.update(recipientId, body);

        if (!recipient) {
            logger.warn({ recipientId }, `${this.constructor.name}.${this.update.name}: Recipient not found`);
            throw new HTTPException(404, { message: "Recipient not found" });
        }

        logger.debug({ recipient }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

        return c.json(recipient);
    }

    /**
     * DELETE /recipients/:recipient_id
     * Deletes a recipient.
     *
     * @param c - Hono request context; expects a `recipient_id` route param.
     * @returns JSON response with the deleted recipient.
     * @throws {HTTPException} 400 if the `recipient_id` param is missing.
     * @throws {HTTPException} 404 if no recipient matches the given id.
     */
    delete = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);

        const recipientId = c.req.param('recipient_id');

        if (!recipientId) {
            throw new HTTPException(400, { message: "Missing Parameters: recipientId" });
        }

        logger.debug({ recipientId }, `Request:`);

        const recipient = await this.recipientService.delete(recipientId);

        if (!recipient) {
            logger.warn({ recipientId }, `${this.constructor.name}.${this.delete.name}: Recipient not found`);
            throw new HTTPException(404, { message: "Recipient not found" });
        }

        logger.debug({ recipient }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

        return c.json(recipient);
    }

    /**
     * POST /groups/:group_id/recipients
     * Adds an existing recipient to a group. Already a member is a no-op.
     *
     * @param c - Hono request context; expects a `group_id` route param and a
     * JSON body `{ recipient_id }`.
     * @returns JSON response with the recipient and its updated `group_ids`.
     * @throws {HTTPException} 400 if `group_id` or `recipient_id` is missing.
     * @throws {HTTPException} 404 if the group or recipient doesn't exist.
     */
    addToGroup = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.addToGroup.name}`);

        const groupId = c.req.param('group_id');
        const body = await c.req.json();
        const recipientId = typeof body?.recipient_id === "string" ? body.recipient_id : undefined;

        if (!groupId || !recipientId) {
            throw new HTTPException(400, { message: "Missing Parameters: groupId, recipient_id" });
        }

        logger.debug({ groupId, recipientId }, `Request:`);

        const recipient = await this.recipientService.addToGroup(groupId, recipientId);

        if (!recipient) {
            logger.warn({ groupId, recipientId }, `${this.constructor.name}.${this.addToGroup.name}: Group or recipient not found`);
            throw new HTTPException(404, { message: "Group or recipient not found" });
        }

        logger.debug({ recipient }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.addToGroup.name}`);

        return c.json(recipient);
    }

    /**
     * DELETE /groups/:group_id/recipients/:recipient_id
     * Removes a recipient from a group; the recipient itself is kept.
     *
     * @param c - Hono request context; expects `group_id` and `recipient_id` route params.
     * @returns JSON response with the recipient and its updated `group_ids`.
     * @throws {HTTPException} 400 if a param is missing.
     * @throws {HTTPException} 404 if the recipient isn't in the group.
     */
    removeFromGroup = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.removeFromGroup.name}`);

        const groupId = c.req.param('group_id');
        const recipientId = c.req.param('recipient_id');

        if (!groupId || !recipientId) {
            throw new HTTPException(400, { message: "Missing Parameters: groupId, recipientId" });
        }

        logger.debug({ groupId, recipientId }, `Request:`);

        const recipient = await this.recipientService.removeFromGroup(groupId, recipientId);

        if (!recipient) {
            logger.warn({ groupId, recipientId }, `${this.constructor.name}.${this.removeFromGroup.name}: Recipient not in group`);
            throw new HTTPException(404, { message: "Recipient is not in this group" });
        }

        logger.debug({ recipient }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.removeFromGroup.name}`);

        return c.json(recipient);
    }
}

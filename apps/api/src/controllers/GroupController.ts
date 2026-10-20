import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../libs";
import { GroupService } from "../services";

/**
 * HTTP layer for group-related endpoints. Translates Hono `Context` objects
 * into `GroupService` calls and maps the results to HTTP responses/errors.
 * Groups live at `/groups`, and are
 * additionally nested under a campaign
 * (`/campaigns/:campaign_id/groups`) for
 * campaign-scoped listing/creation.
 */
export class GroupController {
    constructor(private groupService: GroupService) {
    }

    /**
     * GET /groups
     * Lists every group, across all campaigns.
     *
     * @param c - Hono request context; accepts optional `limit` (max rows to return) and `offset`
     * (rows to skip before returning results) query params.
     * @returns JSON array of groups.
     */
    getAll = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);

        const limitParam = c.req.query('limit');
        const offsetParam = c.req.query('offset');
        const limit = limitParam !== undefined ? Number(limitParam) : undefined;
        const offset = offsetParam !== undefined ? Number(offsetParam) : undefined;

        logger.debug({ limit, offset }, `Request:`);

        const groups = await this.groupService.getAll({ limit, offset });

        logger.debug({ count: groups.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

        return c.json(groups);
    }

    /**
     * POST /groups
     * Creates a new group.
     *
     * @param c - Hono request context; expects a JSON body with the group fields.
     * @returns JSON response with the created group.
     */
    post = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.post.name}`);

        const body = await c.req.json();

        logger.debug({ body }, `Request:`);

        const group = await this.groupService.create(body);

        logger.debug({ group }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.post.name}`);

        return c.json(group, 201);
    }

    /**
     * GET /campaigns/:campaign_id/groups
     * Lists groups belonging to a single campaign.
     *
     * @param c - Hono request context; expects a `campaign_id` route param.
     * Accepts optional `limit` (max rows to return) and `offset` (rows to
     * skip before returning results) query params.
     * @returns JSON array of groups.
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

        const groups = await this.groupService.getByCampaign(campaignId, { limit, offset });

        logger.debug({ campaignId, count: groups.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAllByCampaign.name}`);

        return c.json(groups);
    }

    /**
     * POST /campaigns/:campaign_id/groups
     * Creates a new group within a campaign.
     *
     * @param c - Hono request context; expects a `campaign_id`
     * route param and a JSON body with the group fields.
     * @returns JSON response with the created group.
     * @throws {HTTPException} 400 if the `campaign_id` param is missing.
     */
    postByCampaign = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.postByCampaign.name}`);

        const campaignId = c.req.param('campaign_id');

        if (!campaignId) {
            throw new HTTPException(400, { message: "Missing Parameters: campaignId" });
        }

        const body = await c.req.json();

        logger.debug({ campaignId, body }, `Request:`);

        const group = await this.groupService.create({ ...body, campaign_id: campaignId });

        logger.debug({ campaignId, group }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.postByCampaign.name}`);

        return c.json(group, 201);
    }

    /**
     * GET /groups/:group_id
     * Fetches a single group by id.
     *
     * @param c - Hono request context; expects a `group_id` route param.
     * @returns JSON response with the group document.
     * @throws {HTTPException} 400 if the `group_id` param is missing.
     * @throws {HTTPException} 404 if no group matches the given id.
     */
    get = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.get.name}`);

        const groupId = c.req.param('group_id');

        if (!groupId) {
            throw new HTTPException(400, { message: "Missing Parameters: groupId" });
        }

        logger.debug({ groupId }, `Request:`);

        const group = await this.groupService.getById(groupId);

        if (!group) {
            logger.warn({ groupId }, `${this.constructor.name}.${this.get.name}: Group not found`);
            throw new HTTPException(404, { message: "Group not found" });
        }

        logger.debug({ group }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.get.name}`);

        return c.json(group);
    }

    /**
     * PATCH /groups/:group_id
     * Partially updates a group.
     *
     * @param c - Hono request context; expects a `group_id` route param and
     * a JSON body with the fields to update.
     * @returns JSON response with the updated group.
     * @throws {HTTPException} 400 if the `group_id` param is missing.
     * @throws {HTTPException} 404 if no group matches the given id.
     */
    update = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);

        const groupId = c.req.param('group_id');

        if (!groupId) {
            throw new HTTPException(400, { message: "Missing Parameters: groupId" });
        }

        const body = await c.req.json();

        logger.debug({ groupId, body }, `Request:`);

        const group = await this.groupService.update(groupId, body);

        if (!group) {
            logger.warn({ groupId }, `${this.constructor.name}.${this.update.name}: Group not found`);
            throw new HTTPException(404, { message: "Group not found" });
        }

        logger.debug({ group }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

        return c.json(group);
    }

    /**
     * DELETE /groups/:group_id
     * Deletes a group.
     *
     * @param c - Hono request context; expects a `group_id` route param.
     * @returns JSON response with the deleted group.
     * @throws {HTTPException} 400 if the `group_id` param is missing.
     * @throws {HTTPException} 404 if no group matches the given id.
     */
    delete = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);

        const groupId = c.req.param('group_id');

        if (!groupId) {
            throw new HTTPException(400, { message: "Missing Parameters: groupId" });
        }

        logger.debug({ groupId }, `Request:`);

        const group = await this.groupService.delete(groupId);

        if (!group) {
            logger.warn({ groupId }, `${this.constructor.name}.${this.delete.name}: Group not found`);
            throw new HTTPException(404, { message: "Group not found" });
        }

        logger.debug({ group }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

        return c.json(group);
    }
}

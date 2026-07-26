import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger, DEFAULT_PAGE_SIZE, decodePageToken, buildPage } from "../libs";
import { GroupService } from "../services";

/**
 * HTTP layer for group-related endpoints. Translates Hono `Context` objects
 * into `GroupService` calls and maps the results to HTTP responses/errors.
 * Groups are nested under an organization
 * (`/organizations/:organization_id/groups`) for org-wide access, and
 * additionally under a campaign
 * (`/organizations/:organization_id/campaigns/:campaign_id/groups`) for
 * campaign-scoped listing/creation.
 */
export class GroupController {
    constructor(private groupService: GroupService) {
    }

    /**
     * GET /organizations/:organization_id/groups
     * Lists every group belonging to an organization, across all campaigns.
     *
     * @param c - Hono request context; expects an `organization_id` route
     * param. Accepts optional `count` (max rows to return, defaults to
     * {@link DEFAULT_PAGE_SIZE}) and `page_token` (the base64-encoded
     * `next_page_token` from the previous response) query params.
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

        const countParam = c.req.query('count');
        const pageTokenParam = c.req.query('page_token');
        const count = countParam !== undefined ? Number(countParam) : DEFAULT_PAGE_SIZE;
        const pageToken = pageTokenParam ? decodePageToken(pageTokenParam) : undefined;

        logger.debug({ organizationId, count, pageToken }, `Request:`);

        const groups = await this.groupService.getByOrganization(organizationId, { count, pageToken });

        logger.debug({ organizationId, count: groups.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

        return c.json(buildPage(groups, count));
    }

    /**
     * POST /organizations/:organization_id/groups
     * Creates a new group within an organization.
     *
     * @param c - Hono request context; expects an `organization_id` route
     * param and a JSON body with the group fields.
     * @returns JSON response with the created group.
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

        const group = await this.groupService.create({ ...body, organization_id: organizationId });

        logger.debug({ organizationId, group }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.post.name}`);

        return c.json(group, 201);
    }

    /**
     * GET /organizations/:organization_id/campaigns/:campaign_id/groups
     * Lists groups belonging to a single campaign.
     *
     * @param c - Hono request context; expects a `campaign_id` route param.
     * Accepts optional `count` (max rows to return, defaults to
     * {@link DEFAULT_PAGE_SIZE}) and `page_token` (the base64-encoded
     * `next_page_token` from the previous response) query params.
     * @returns JSON `{ data, next_page_token }` - `next_page_token` is
     * `null` once the last page has been reached.
     * @throws {HTTPException} 400 if the `campaign_id` param is missing.
     */
    getAllByCampaign = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.getAllByCampaign.name}`);

        const campaignId = c.req.param('campaign_id');

        if (!campaignId) {
            throw new HTTPException(400, { message: "Missing Parameters: campaignId" });
        }

        const countParam = c.req.query('count');
        const pageTokenParam = c.req.query('page_token');
        const count = countParam !== undefined ? Number(countParam) : DEFAULT_PAGE_SIZE;
        const pageToken = pageTokenParam ? decodePageToken(pageTokenParam) : undefined;

        logger.debug({ campaignId, count, pageToken }, `Request:`);

        const groups = await this.groupService.getByCampaign(campaignId, { count, pageToken });

        logger.debug({ campaignId, count: groups.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAllByCampaign.name}`);

        return c.json(buildPage(groups, count));
    }

    /**
     * POST /organizations/:organization_id/campaigns/:campaign_id/groups
     * Creates a new group within a campaign.
     *
     * @param c - Hono request context; expects `organization_id` and
     * `campaign_id` route params and a JSON body with the group fields.
     * @returns JSON response with the created group.
     * @throws {HTTPException} 400 if `organization_id` or `campaign_id` is missing.
     */
    postByCampaign = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.postByCampaign.name}`);

        const organizationId = c.req.param('organization_id');
        const campaignId = c.req.param('campaign_id');

        if (!organizationId || !campaignId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId, campaignId" });
        }

        const body = await c.req.json();

        logger.debug({ organizationId, campaignId, body }, `Request:`);

        const group = await this.groupService.create({ ...body, organization_id: organizationId, campaign_id: campaignId });

        logger.debug({ organizationId, campaignId, group }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.postByCampaign.name}`);

        return c.json(group, 201);
    }

    /**
     * GET /organizations/:organization_id/groups/:group_id
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
     * PATCH /organizations/:organization_id/groups/:group_id
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
     * DELETE /organizations/:organization_id/groups/:group_id
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

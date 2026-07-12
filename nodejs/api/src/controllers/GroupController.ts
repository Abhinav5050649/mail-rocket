import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../libs";
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
     * @param c - Hono request context; expects an `organization_id` route param.
     * @returns JSON array of matching groups.
     * @throws {HTTPException} 400 if the `organization_id` param is missing.
     */
    getAll = async (c: Context) => {
        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        logger.info({ organizationId }, `${this.constructor.name}.${this.getAll.name}: Fetching groups`);

        const groups = await this.groupService.getByOrganization(organizationId);

        logger.info({ organizationId, count: groups.length }, `${this.constructor.name}.${this.getAll.name}: Groups fetched successfully`);

        return c.json(groups);
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
        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        const body = await c.req.json();

        logger.info({ organizationId, body }, `${this.constructor.name}.${this.post.name}: Creating group`);

        const group = await this.groupService.create({ ...body, organization_id: organizationId });

        logger.info({ organizationId, groupId: group.id }, `${this.constructor.name}.${this.post.name}: Group created successfully`);

        return c.json(group, 201);
    }

    /**
     * GET /organizations/:organization_id/campaigns/:campaign_id/groups
     * Lists groups belonging to a single campaign.
     *
     * @param c - Hono request context; expects a `campaign_id` route param.
     * @returns JSON array of matching groups.
     * @throws {HTTPException} 400 if the `campaign_id` param is missing.
     */
    getAllByCampaign = async (c: Context) => {
        const campaignId = c.req.param('campaign_id');

        if (!campaignId) {
            throw new HTTPException(400, { message: "Missing Parameters: campaignId" });
        }

        logger.info({ campaignId }, `${this.constructor.name}.${this.getAllByCampaign.name}: Fetching groups for campaign`);

        const groups = await this.groupService.getByCampaign(campaignId);

        logger.info({ campaignId, count: groups.length }, `${this.constructor.name}.${this.getAllByCampaign.name}: Groups fetched successfully`);

        return c.json(groups);
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
        const organizationId = c.req.param('organization_id');
        const campaignId = c.req.param('campaign_id');

        if (!organizationId || !campaignId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId, campaignId" });
        }

        const body = await c.req.json();

        logger.info({ organizationId, campaignId, body }, `${this.constructor.name}.${this.postByCampaign.name}: Creating group`);

        const group = await this.groupService.create({ ...body, organization_id: organizationId, campaign_id: campaignId });

        logger.info({ organizationId, campaignId, groupId: group.id }, `${this.constructor.name}.${this.postByCampaign.name}: Group created successfully`);

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
        const groupId = c.req.param('group_id');

        if (!groupId) {
            throw new HTTPException(400, { message: "Missing Parameters: groupId" });
        }

        logger.info({ groupId }, `${this.constructor.name}.${this.get.name}: Fetching group`);

        const group = await this.groupService.getById(groupId);

        if (!group) {
            logger.warn({ groupId }, `${this.constructor.name}.${this.get.name}: Group not found`);
            throw new HTTPException(404, { message: "Group not found" });
        }

        logger.info({ groupId }, `${this.constructor.name}.${this.get.name}: Group fetched successfully`);

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
        const groupId = c.req.param('group_id');

        if (!groupId) {
            throw new HTTPException(400, { message: "Missing Parameters: groupId" });
        }

        const body = await c.req.json();

        logger.info({ groupId, body }, `${this.constructor.name}.${this.update.name}: Updating group`);

        const group = await this.groupService.update(groupId, body);

        if (!group) {
            logger.warn({ groupId }, `${this.constructor.name}.${this.update.name}: Group not found`);
            throw new HTTPException(404, { message: "Group not found" });
        }

        logger.info({ groupId }, `${this.constructor.name}.${this.update.name}: Group updated successfully`);

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
        const groupId = c.req.param('group_id');

        if (!groupId) {
            throw new HTTPException(400, { message: "Missing Parameters: groupId" });
        }

        logger.info({ groupId }, `${this.constructor.name}.${this.delete.name}: Deleting group`);

        const group = await this.groupService.delete(groupId);

        if (!group) {
            logger.warn({ groupId }, `${this.constructor.name}.${this.delete.name}: Group not found`);
            throw new HTTPException(404, { message: "Group not found" });
        }

        logger.info({ groupId }, `${this.constructor.name}.${this.delete.name}: Group deleted successfully`);

        return c.json(group);
    }
}

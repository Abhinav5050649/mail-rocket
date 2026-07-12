import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../libs";
import { CampaignService } from "../services";

/**
 * HTTP layer for campaign-related endpoints. Translates Hono `Context`
 * objects into `CampaignService` calls and maps the results to HTTP
 * responses/errors. Campaigns are nested under an organization:
 * `/organizations/:organization_id/campaigns`.
 */
export class CampaignController {
    constructor(private campaignService: CampaignService) {
    }

    /**
     * GET /organizations/:organization_id/campaigns
     * Lists campaigns belonging to an organization.
     *
     * @param c - Hono request context; expects an `organization_id` route param.
     * @returns JSON array of matching campaigns.
     * @throws {HTTPException} 400 if the `organization_id` param is missing.
     */
    getAll = async (c: Context) => {
        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        logger.info({ organizationId }, `${this.constructor.name}.${this.getAll.name}: Fetching campaigns`);

        const campaigns = await this.campaignService.getByOrganization(organizationId);

        logger.info({ organizationId, count: campaigns.length }, `${this.constructor.name}.${this.getAll.name}: Campaigns fetched successfully`);

        return c.json(campaigns);
    }

    /**
     * POST /organizations/:organization_id/campaigns
     * Creates a new campaign within an organization.
     *
     * @param c - Hono request context; expects an `organization_id` route
     * param and a JSON body with the campaign fields.
     * @returns JSON response with the created campaign.
     * @throws {HTTPException} 400 if the `organization_id` param is missing.
     */
    post = async (c: Context) => {
        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        const body = await c.req.json();

        logger.info({ organizationId, body }, `${this.constructor.name}.${this.post.name}: Creating campaign`);

        const campaign = await this.campaignService.create({ ...body, organization_id: organizationId });

        logger.info({ organizationId, campaignId: campaign.id }, `${this.constructor.name}.${this.post.name}: Campaign created successfully`);

        return c.json(campaign, 201);
    }

    /**
     * GET /organizations/:organization_id/campaigns/:campaign_id
     * Fetches a single campaign by id.
     *
     * @param c - Hono request context; expects a `campaign_id` route param.
     * @returns JSON response with the campaign document.
     * @throws {HTTPException} 400 if the `campaign_id` param is missing.
     * @throws {HTTPException} 404 if no campaign matches the given id.
     */
    get = async (c: Context) => {
        const campaignId = c.req.param('campaign_id');

        if (!campaignId) {
            throw new HTTPException(400, { message: "Missing Parameters: campaignId" });
        }

        logger.info({ campaignId }, `${this.constructor.name}.${this.get.name}: Fetching campaign`);

        const campaign = await this.campaignService.getById(campaignId);

        if (!campaign) {
            logger.warn({ campaignId }, `${this.constructor.name}.${this.get.name}: Campaign not found`);
            throw new HTTPException(404, { message: "Campaign not found" });
        }

        logger.info({ campaignId }, `${this.constructor.name}.${this.get.name}: Campaign fetched successfully`);

        return c.json(campaign);
    }

    /**
     * PATCH /organizations/:organization_id/campaigns/:campaign_id
     * Partially updates a campaign.
     *
     * @param c - Hono request context; expects a `campaign_id` route param
     * and a JSON body with the fields to update.
     * @returns JSON response with the updated campaign.
     * @throws {HTTPException} 400 if the `campaign_id` param is missing.
     * @throws {HTTPException} 404 if no campaign matches the given id.
     */
    update = async (c: Context) => {
        const campaignId = c.req.param('campaign_id');

        if (!campaignId) {
            throw new HTTPException(400, { message: "Missing Parameters: campaignId" });
        }

        const body = await c.req.json();

        logger.info({ campaignId, body }, `${this.constructor.name}.${this.update.name}: Updating campaign`);

        const campaign = await this.campaignService.update(campaignId, body);

        if (!campaign) {
            logger.warn({ campaignId }, `${this.constructor.name}.${this.update.name}: Campaign not found`);
            throw new HTTPException(404, { message: "Campaign not found" });
        }

        logger.info({ campaignId }, `${this.constructor.name}.${this.update.name}: Campaign updated successfully`);

        return c.json(campaign);
    }

    /**
     * DELETE /organizations/:organization_id/campaigns/:campaign_id
     * Deletes a campaign.
     *
     * @param c - Hono request context; expects a `campaign_id` route param.
     * @returns JSON response with the deleted campaign.
     * @throws {HTTPException} 400 if the `campaign_id` param is missing.
     * @throws {HTTPException} 404 if no campaign matches the given id.
     */
    delete = async (c: Context) => {
        const campaignId = c.req.param('campaign_id');

        if (!campaignId) {
            throw new HTTPException(400, { message: "Missing Parameters: campaignId" });
        }

        logger.info({ campaignId }, `${this.constructor.name}.${this.delete.name}: Deleting campaign`);

        const campaign = await this.campaignService.delete(campaignId);

        if (!campaign) {
            logger.warn({ campaignId }, `${this.constructor.name}.${this.delete.name}: Campaign not found`);
            throw new HTTPException(404, { message: "Campaign not found" });
        }

        logger.info({ campaignId }, `${this.constructor.name}.${this.delete.name}: Campaign deleted successfully`);

        return c.json(campaign);
    }
}

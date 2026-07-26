import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger, DEFAULT_PAGE_SIZE, decodePageToken, buildPage } from "../libs";
import { CampaignService } from "../services";
import type { CampaignStatus } from "../models";

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
     * @param c - Hono request context; expects an `organization_id` route
     * param. Accepts an optional `status` filter, and optional `count`
     * (max rows to return, defaults to {@link DEFAULT_PAGE_SIZE}) and
     * `page_token` (the base64-encoded `next_page_token` from the previous
     * response) query params.
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

        const status = c.req.query('status') as CampaignStatus | undefined;
        const countParam = c.req.query('count');
        const pageTokenParam = c.req.query('page_token');
        const count = countParam !== undefined ? Number(countParam) : DEFAULT_PAGE_SIZE;
        const pageToken = pageTokenParam ? decodePageToken(pageTokenParam) : undefined;

        logger.debug({ organizationId, status, count, pageToken }, `Request:`);

        const campaigns = await this.campaignService.getByOrganization(organizationId, { status, count, pageToken });

        logger.debug({ organizationId, count: campaigns.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

        return c.json(buildPage(campaigns, count));
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
        logger.info(`Start method: ${this.constructor.name}.${this.post.name}`);

        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        const body = await c.req.json();

        logger.debug({ organizationId, body }, `Request:`);

        const campaign = await this.campaignService.create({ ...body, organization_id: organizationId });

        logger.debug({ organizationId, campaign }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.post.name}`);

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
        logger.info(`Start method: ${this.constructor.name}.${this.get.name}`);

        const campaignId = c.req.param('campaign_id');

        if (!campaignId) {
            throw new HTTPException(400, { message: "Missing Parameters: campaignId" });
        }

        logger.debug({ campaignId }, `Request:`);

        const campaign = await this.campaignService.getById(campaignId);

        if (!campaign) {
            logger.warn({ campaignId }, `${this.constructor.name}.${this.get.name}: Campaign not found`);
            throw new HTTPException(404, { message: "Campaign not found" });
        }

        logger.debug({ campaign }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.get.name}`);

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
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);

        const campaignId = c.req.param('campaign_id');

        if (!campaignId) {
            throw new HTTPException(400, { message: "Missing Parameters: campaignId" });
        }

        const body = await c.req.json();

        logger.debug({ campaignId, body }, `Request:`);

        const campaign = await this.campaignService.update(campaignId, body);

        if (!campaign) {
            logger.warn({ campaignId }, `${this.constructor.name}.${this.update.name}: Campaign not found`);
            throw new HTTPException(404, { message: "Campaign not found" });
        }

        logger.debug({ campaign }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

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
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);

        const campaignId = c.req.param('campaign_id');

        if (!campaignId) {
            throw new HTTPException(400, { message: "Missing Parameters: campaignId" });
        }

        logger.debug({ campaignId }, `Request:`);

        const campaign = await this.campaignService.delete(campaignId);

        if (!campaign) {
            logger.warn({ campaignId }, `${this.constructor.name}.${this.delete.name}: Campaign not found`);
            throw new HTTPException(404, { message: "Campaign not found" });
        }

        logger.debug({ campaign }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

        return c.json(campaign);
    }
}

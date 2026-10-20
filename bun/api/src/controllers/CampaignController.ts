import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { assertNoSystemFields, logger } from "../libs";
import { CampaignService } from "../services";
import type { CampaignStatus } from "../models";

/**
 * JSON bodies carry `start_time` as a string; Drizzle's timestamp column
 * needs a real `Date`. Mutates `body.start_time` in place, and only when the
 * key is actually present, so callers that don't touch `start_time` leave no
 * trace of it on the object (`CampaignService.update` uses `"start_time" in
 * data` to decide whether to touch scheduling).
 *
 * @throws {HTTPException} 400 if `start_time` is present but not a valid date string.
 */
const coerceStartTime = (body: Record<string, unknown>): void => {
    if (!("start_time" in body) || body.start_time === null) return;

    const date = new Date(body.start_time as string);
    if (isNaN(date.getTime())) {
        throw new HTTPException(400, { message: "Invalid start_time" });
    }
    body.start_time = date;
};

/**
 * Fields the send pipeline owns. `status` must stay in step with the queued
 * dispatch job - set by `CampaignService` when `start_time` changes and by
 * the send workers afterwards - so a client writing it could mark a campaign
 * "scheduled" that will never send, or "draft" while its job still fires.
 */
const CAMPAIGN_SYSTEM_FIELDS = ["status", "failure_reason"] as const;

/** How a client actually controls sending, for the rejection message. */
const SCHEDULING_HINT = "Set start_time to schedule a send, or set it to null to cancel one.";

/**
 * HTTP layer for campaign-related endpoints. Translates Hono `Context`
 * objects into `CampaignService` calls and maps the results to HTTP
 * responses/errors. Campaigns live at `/campaigns`.
 */
export class CampaignController {
    constructor(private campaignService: CampaignService) {
    }

    /**
     * GET /campaigns
     * Lists all campaigns.
     *
     * @param c - Hono request context; accepts an optional `status` filter, and optional `limit`
     * (max rows to return) and `offset` (rows to skip before returning
     * results) query params.
     * @returns JSON array of campaigns.
     */
    getAll = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);

        const status = c.req.query('status') as CampaignStatus | undefined;
        const limitParam = c.req.query('limit');
        const offsetParam = c.req.query('offset');
        const limit = limitParam !== undefined ? Number(limitParam) : undefined;
        const offset = offsetParam !== undefined ? Number(offsetParam) : undefined;

        logger.debug({ status, limit, offset }, `Request:`);

        const campaigns = await this.campaignService.getAll({ status, limit, offset });

        logger.debug({ count: campaigns.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

        return c.json(campaigns);
    }

    /**
     * POST /campaigns
     * Creates a new campaign.
     *
     * @param c - Hono request context; expects a JSON body with the campaign fields.
     * @returns JSON response with the created campaign.
     * @throws {ValidationError} 400 if the body sets `status` or `failure_reason`.
     */
    post = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.post.name}`);

        const body = await c.req.json();
        assertNoSystemFields(body, CAMPAIGN_SYSTEM_FIELDS, SCHEDULING_HINT);
        coerceStartTime(body);

        logger.debug({ body }, `Request:`);

        const campaign = await this.campaignService.create(body);

        logger.debug({ campaign }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.post.name}`);

        return c.json(campaign, 201);
    }

    /**
     * GET /campaigns/:campaign_id
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
     * PATCH /campaigns/:campaign_id
     * Partially updates a campaign.
     *
     * @param c - Hono request context; expects a `campaign_id` route param
     * and a JSON body with the fields to update.
     * @returns JSON response with the updated campaign.
     * @throws {HTTPException} 400 if the `campaign_id` param is missing.
     * @throws {HTTPException} 404 if no campaign matches the given id.
     * @throws {ValidationError} 400 if the body sets `status` or `failure_reason`.
     */
    update = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);

        const campaignId = c.req.param('campaign_id');

        if (!campaignId) {
            throw new HTTPException(400, { message: "Missing Parameters: campaignId" });
        }

        const body = await c.req.json();
        assertNoSystemFields(body, CAMPAIGN_SYSTEM_FIELDS, SCHEDULING_HINT);
        coerceStartTime(body);

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
     * DELETE /campaigns/:campaign_id
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

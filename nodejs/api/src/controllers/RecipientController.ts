import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger, DEFAULT_PAGE_SIZE, decodePageToken, buildPage } from "../libs";
import { RecipientService } from "../services";

/**
 * HTTP layer for recipient-related endpoints. Translates Hono `Context`
 * objects into `RecipientService` calls and maps the results to HTTP
 * responses/errors. Recipients are nested under an organization
 * (`/organizations/:organization_id/recipients`) for org-wide access, and
 * additionally under a campaign
 * (`/organizations/:organization_id/campaigns/:campaign_id/recipients`) or a
 * group within a campaign
 * (`/organizations/:organization_id/campaigns/:campaign_id/groups/:group_id/recipients`)
 * for narrower listing/creation.
 */
export class RecipientController {
    constructor(private recipientService: RecipientService) {
    }

    /**
     * GET /organizations/:organization_id/recipients
     * Lists every recipient belonging to an organization, across all
     * campaigns and groups.
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
        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        const countParam = c.req.query('count');
        const pageTokenParam = c.req.query('page_token');
        const count = countParam !== undefined ? Number(countParam) : DEFAULT_PAGE_SIZE;
        const pageToken = pageTokenParam ? decodePageToken(pageTokenParam) : undefined;

        logger.info({ organizationId, count, pageToken }, `${this.constructor.name}.${this.getAll.name}: Fetching recipients`);

        const recipients = await this.recipientService.getByOrganization(organizationId, { count, pageToken });

        logger.info({ organizationId, count: recipients.length }, `${this.constructor.name}.${this.getAll.name}: Recipients fetched successfully`);

        return c.json(buildPage(recipients, count));
    }

    /**
     * POST /organizations/:organization_id/recipients
     * Creates a new recipient within an organization.
     *
     * @param c - Hono request context; expects an `organization_id` route
     * param and a JSON body with the recipient fields.
     * @returns JSON response with the created recipient.
     * @throws {HTTPException} 400 if the `organization_id` param is missing.
     */
    post = async (c: Context) => {
        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        const body = await c.req.json();

        logger.info({ organizationId, body }, `${this.constructor.name}.${this.post.name}: Creating recipient`);

        const recipient = await this.recipientService.create({ ...body, organization_id: organizationId });

        logger.info({ organizationId, recipientId: recipient.id }, `${this.constructor.name}.${this.post.name}: Recipient created successfully`);

        return c.json(recipient, 201);
    }

    /**
     * GET /organizations/:organization_id/campaigns/:campaign_id/recipients
     * Lists recipients belonging to a single campaign.
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
        const campaignId = c.req.param('campaign_id');

        if (!campaignId) {
            throw new HTTPException(400, { message: "Missing Parameters: campaignId" });
        }

        const countParam = c.req.query('count');
        const pageTokenParam = c.req.query('page_token');
        const count = countParam !== undefined ? Number(countParam) : DEFAULT_PAGE_SIZE;
        const pageToken = pageTokenParam ? decodePageToken(pageTokenParam) : undefined;

        logger.info({ campaignId, count, pageToken }, `${this.constructor.name}.${this.getAllByCampaign.name}: Fetching recipients for campaign`);

        const recipients = await this.recipientService.getByCampaign(campaignId, { count, pageToken });

        logger.info({ campaignId, count: recipients.length }, `${this.constructor.name}.${this.getAllByCampaign.name}: Recipients fetched successfully`);

        return c.json(buildPage(recipients, count));
    }

    /**
     * POST /organizations/:organization_id/campaigns/:campaign_id/recipients
     * Creates a new recipient within a campaign.
     *
     * @param c - Hono request context; expects `organization_id` and
     * `campaign_id` route params and a JSON body with the recipient fields.
     * @returns JSON response with the created recipient.
     * @throws {HTTPException} 400 if `organization_id` or `campaign_id` is missing.
     */
    postByCampaign = async (c: Context) => {
        const organizationId = c.req.param('organization_id');
        const campaignId = c.req.param('campaign_id');

        if (!organizationId || !campaignId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId, campaignId" });
        }

        const body = await c.req.json();

        logger.info({ organizationId, campaignId, body }, `${this.constructor.name}.${this.postByCampaign.name}: Creating recipient`);

        const recipient = await this.recipientService.create({ ...body, organization_id: organizationId, campaign_id: campaignId });

        logger.info({ organizationId, campaignId, recipientId: recipient.id }, `${this.constructor.name}.${this.postByCampaign.name}: Recipient created successfully`);

        return c.json(recipient, 201);
    }

    /**
     * GET /organizations/:organization_id/campaigns/:campaign_id/groups/:group_id/recipients
     * Lists recipients belonging to a single group.
     *
     * @param c - Hono request context; expects a `group_id` route param.
     * Accepts optional `count` (max rows to return, defaults to
     * {@link DEFAULT_PAGE_SIZE}) and `page_token` (the base64-encoded
     * `next_page_token` from the previous response) query params.
     * @returns JSON `{ data, next_page_token }` - `next_page_token` is
     * `null` once the last page has been reached.
     * @throws {HTTPException} 400 if the `group_id` param is missing.
     */
    getAllByGroup = async (c: Context) => {
        const groupId = c.req.param('group_id');

        if (!groupId) {
            throw new HTTPException(400, { message: "Missing Parameters: groupId" });
        }

        const countParam = c.req.query('count');
        const pageTokenParam = c.req.query('page_token');
        const count = countParam !== undefined ? Number(countParam) : DEFAULT_PAGE_SIZE;
        const pageToken = pageTokenParam ? decodePageToken(pageTokenParam) : undefined;

        logger.info({ groupId, count, pageToken }, `${this.constructor.name}.${this.getAllByGroup.name}: Fetching recipients for group`);

        const recipients = await this.recipientService.getByGroup(groupId, { count, pageToken });

        logger.info({ groupId, count: recipients.length }, `${this.constructor.name}.${this.getAllByGroup.name}: Recipients fetched successfully`);

        return c.json(buildPage(recipients, count));
    }

    /**
     * POST /organizations/:organization_id/campaigns/:campaign_id/groups/:group_id/recipients
     * Creates a new recipient within a group.
     *
     * @param c - Hono request context; expects `organization_id`,
     * `campaign_id`, and `group_id` route params and a JSON body with the
     * recipient fields.
     * @returns JSON response with the created recipient.
     * @throws {HTTPException} 400 if `organization_id`, `campaign_id`, or `group_id` is missing.
     */
    postByGroup = async (c: Context) => {
        const organizationId = c.req.param('organization_id');
        const campaignId = c.req.param('campaign_id');
        const groupId = c.req.param('group_id');

        if (!organizationId || !campaignId || !groupId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId, campaignId, groupId" });
        }

        const body = await c.req.json();

        logger.info({ organizationId, campaignId, groupId, body }, `${this.constructor.name}.${this.postByGroup.name}: Creating recipient`);

        const recipient = await this.recipientService.create({
            ...body,
            organization_id: organizationId,
            campaign_id: campaignId,
            group_id: groupId,
        });

        logger.info({ organizationId, campaignId, groupId, recipientId: recipient.id }, `${this.constructor.name}.${this.postByGroup.name}: Recipient created successfully`);

        return c.json(recipient, 201);
    }

    /**
     * GET /organizations/:organization_id/recipients/:recipient_id
     * Fetches a single recipient by id.
     *
     * @param c - Hono request context; expects a `recipient_id` route param.
     * @returns JSON response with the recipient document.
     * @throws {HTTPException} 400 if the `recipient_id` param is missing.
     * @throws {HTTPException} 404 if no recipient matches the given id.
     */
    get = async (c: Context) => {
        const recipientId = c.req.param('recipient_id');

        if (!recipientId) {
            throw new HTTPException(400, { message: "Missing Parameters: recipientId" });
        }

        logger.info({ recipientId }, `${this.constructor.name}.${this.get.name}: Fetching recipient`);

        const recipient = await this.recipientService.getById(recipientId);

        if (!recipient) {
            logger.warn({ recipientId }, `${this.constructor.name}.${this.get.name}: Recipient not found`);
            throw new HTTPException(404, { message: "Recipient not found" });
        }

        logger.info({ recipientId }, `${this.constructor.name}.${this.get.name}: Recipient fetched successfully`);

        return c.json(recipient);
    }

    /**
     * PATCH /organizations/:organization_id/recipients/:recipient_id
     * Partially updates a recipient.
     *
     * @param c - Hono request context; expects a `recipient_id` route param
     * and a JSON body with the fields to update.
     * @returns JSON response with the updated recipient.
     * @throws {HTTPException} 400 if the `recipient_id` param is missing.
     * @throws {HTTPException} 404 if no recipient matches the given id.
     */
    update = async (c: Context) => {
        const recipientId = c.req.param('recipient_id');

        if (!recipientId) {
            throw new HTTPException(400, { message: "Missing Parameters: recipientId" });
        }

        const body = await c.req.json();

        logger.info({ recipientId, body }, `${this.constructor.name}.${this.update.name}: Updating recipient`);

        const recipient = await this.recipientService.update(recipientId, body);

        if (!recipient) {
            logger.warn({ recipientId }, `${this.constructor.name}.${this.update.name}: Recipient not found`);
            throw new HTTPException(404, { message: "Recipient not found" });
        }

        logger.info({ recipientId }, `${this.constructor.name}.${this.update.name}: Recipient updated successfully`);

        return c.json(recipient);
    }

    /**
     * DELETE /organizations/:organization_id/recipients/:recipient_id
     * Deletes a recipient.
     *
     * @param c - Hono request context; expects a `recipient_id` route param.
     * @returns JSON response with the deleted recipient.
     * @throws {HTTPException} 400 if the `recipient_id` param is missing.
     * @throws {HTTPException} 404 if no recipient matches the given id.
     */
    delete = async (c: Context) => {
        const recipientId = c.req.param('recipient_id');

        if (!recipientId) {
            throw new HTTPException(400, { message: "Missing Parameters: recipientId" });
        }

        logger.info({ recipientId }, `${this.constructor.name}.${this.delete.name}: Deleting recipient`);

        const recipient = await this.recipientService.delete(recipientId);

        if (!recipient) {
            logger.warn({ recipientId }, `${this.constructor.name}.${this.delete.name}: Recipient not found`);
            throw new HTTPException(404, { message: "Recipient not found" });
        }

        logger.info({ recipientId }, `${this.constructor.name}.${this.delete.name}: Recipient deleted successfully`);

        return c.json(recipient);
    }
}

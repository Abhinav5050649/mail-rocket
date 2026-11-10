import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { assertNoSystemFields, logger, ValidationError } from "../libs";
import { SubscriberService } from "../services";

/**
 * Checks a subscriber body. `unsubscribed_at` is only ever set by the
 * subscriber, through an email's unsubscribe link, so the API can't set or
 * clear it. `group_ids`, when present, must be an array of id strings; the
 * old single `group_id` is rejected with a pointer to its replacement rather
 * than silently ignored.
 *
 * @param body - The parsed JSON request body.
 * @throws {ValidationError} (-> 400) on `unsubscribed_at`, `group_id` or a malformed `group_ids`.
 */
const assertSubscriberBody = (body: Record<string, unknown>): void => {
    assertNoSystemFields(body, ["unsubscribed_at"], "Subscribers unsubscribe themselves through the link in every email.");
    if ("group_id" in body) {
        throw new ValidationError("group_id was replaced by group_ids: a subscriber can be in several groups. Send group_ids: [\"<group id>\"] instead.");
    }
    if ("group_ids" in body && (!Array.isArray(body.group_ids) || !body.group_ids.every((id) => typeof id === "string" && id.length > 0))) {
        throw new ValidationError("group_ids must be an array of group id strings");
    }
};

/**
 * HTTP layer for subscriber-related endpoints. Translates Hono `Context`
 * objects into `SubscriberService` calls and maps the results to HTTP
 * responses/errors. Subscribers live at `/subscribers`; a campaign's
 * audience (its groups' members plus its individually picked subscribers)
 * is listed at `/campaigns/:campaign_id/subscribers`. Group membership is
 * many-to-many and is managed at `/groups/:group_id/subscribers`, or by
 * sending `group_ids`. Which subscribers a campaign picks is set on the
 * campaign itself (`subscriber_ids`).
 */
export class SubscriberController {
    constructor(private subscriberService: SubscriberService) {
    }

    /**
     * GET /subscribers
     * Lists every subscriber, across all campaigns and groups.
     *
     * @param c - Hono request context; accepts optional `limit` (max rows to return) and `offset`
     * (rows to skip before returning results) query params.
     * @returns JSON array of subscribers.
     */
    getAll = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);

        const limitParam = c.req.query('limit');
        const offsetParam = c.req.query('offset');
        const limit = limitParam !== undefined ? Number(limitParam) : undefined;
        const offset = offsetParam !== undefined ? Number(offsetParam) : undefined;

        logger.debug({ limit, offset }, `Request:`);

        const subscribers = await this.subscriberService.getAll({ limit, offset });

        logger.debug({ count: subscribers.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

        return c.json(subscribers);
    }

    /**
     * POST /subscribers
     * Creates a new subscriber.
     *
     * @param c - Hono request context; expects a JSON body with the subscriber fields.
     * @returns JSON response with the created subscriber.
     */
    post = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.post.name}`);

        const body = await c.req.json();
        assertSubscriberBody(body);

        logger.debug({ body }, `Request:`);

        const subscriber = await this.subscriberService.create(body);

        logger.debug({ subscriber }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.post.name}`);

        return c.json(subscriber, 201);
    }

    /**
     * GET /campaigns/:campaign_id/subscribers
     * Lists a campaign's audience: subscribers linked to it directly plus
     * members of its linked groups, each once.
     *
     * @param c - Hono request context; expects a `campaign_id` route param.
     * Accepts optional `limit` (max rows to return) and `offset` (rows to
     * skip before returning results) query params.
     * @returns JSON array of subscribers.
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

        const subscribers = await this.subscriberService.getByCampaign(campaignId, { limit, offset });

        logger.debug({ campaignId, count: subscribers.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAllByCampaign.name}`);

        return c.json(subscribers);
    }

    /**
     * GET /groups/:group_id/subscribers
     * Lists subscribers belonging to a single group.
     *
     * @param c - Hono request context; expects a `group_id` route param.
     * Accepts optional `limit` (max rows to return) and `offset` (rows to
     * skip before returning results) query params.
     * @returns JSON array of subscribers.
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

        const subscribers = await this.subscriberService.getByGroup(groupId, { limit, offset });

        logger.debug({ groupId, count: subscribers.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAllByGroup.name}`);

        return c.json(subscribers);
    }

    /**
     * GET /subscribers/:subscriber_id
     * Fetches a single subscriber by id.
     *
     * @param c - Hono request context; expects a `subscriber_id` route param.
     * @returns JSON response with the subscriber document.
     * @throws {HTTPException} 400 if the `subscriber_id` param is missing.
     * @throws {HTTPException} 404 if no subscriber matches the given id.
     */
    get = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.get.name}`);

        const subscriberId = c.req.param('subscriber_id');

        if (!subscriberId) {
            throw new HTTPException(400, { message: "Missing Parameters: subscriberId" });
        }

        logger.debug({ subscriberId }, `Request:`);

        const subscriber = await this.subscriberService.getById(subscriberId);

        if (!subscriber) {
            logger.warn({ subscriberId }, `${this.constructor.name}.${this.get.name}: Subscriber not found`);
            throw new HTTPException(404, { message: "Subscriber not found" });
        }

        logger.debug({ subscriber }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.get.name}`);

        return c.json(subscriber);
    }

    /**
     * PATCH /subscribers/:subscriber_id
     * Partially updates a subscriber.
     *
     * @param c - Hono request context; expects a `subscriber_id` route param
     * and a JSON body with the fields to update.
     * @returns JSON response with the updated subscriber.
     * @throws {HTTPException} 400 if the `subscriber_id` param is missing.
     * @throws {HTTPException} 404 if no subscriber matches the given id.
     */
    update = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);

        const subscriberId = c.req.param('subscriber_id');

        if (!subscriberId) {
            throw new HTTPException(400, { message: "Missing Parameters: subscriberId" });
        }

        const body = await c.req.json();
        assertSubscriberBody(body);

        logger.debug({ subscriberId, body }, `Request:`);

        const subscriber = await this.subscriberService.update(subscriberId, body);

        if (!subscriber) {
            logger.warn({ subscriberId }, `${this.constructor.name}.${this.update.name}: Subscriber not found`);
            throw new HTTPException(404, { message: "Subscriber not found" });
        }

        logger.debug({ subscriber }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

        return c.json(subscriber);
    }

    /**
     * DELETE /subscribers/:subscriber_id
     * Deletes a subscriber.
     *
     * @param c - Hono request context; expects a `subscriber_id` route param.
     * @returns JSON response with the deleted subscriber.
     * @throws {HTTPException} 400 if the `subscriber_id` param is missing.
     * @throws {HTTPException} 404 if no subscriber matches the given id.
     */
    delete = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);

        const subscriberId = c.req.param('subscriber_id');

        if (!subscriberId) {
            throw new HTTPException(400, { message: "Missing Parameters: subscriberId" });
        }

        logger.debug({ subscriberId }, `Request:`);

        const subscriber = await this.subscriberService.delete(subscriberId);

        if (!subscriber) {
            logger.warn({ subscriberId }, `${this.constructor.name}.${this.delete.name}: Subscriber not found`);
            throw new HTTPException(404, { message: "Subscriber not found" });
        }

        logger.debug({ subscriber }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

        return c.json(subscriber);
    }

    /**
     * POST /groups/:group_id/subscribers
     * Adds an existing subscriber to a group. Already a member is a no-op.
     *
     * @param c - Hono request context; expects a `group_id` route param and a
     * JSON body `{ subscriber_id }`.
     * @returns JSON response with the subscriber and its updated `group_ids`.
     * @throws {HTTPException} 400 if `group_id` or `subscriber_id` is missing.
     * @throws {HTTPException} 404 if the group or subscriber doesn't exist.
     */
    addToGroup = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.addToGroup.name}`);

        const groupId = c.req.param('group_id');
        const body = await c.req.json();
        const subscriberId = typeof body?.subscriber_id === "string" ? body.subscriber_id : undefined;

        if (!groupId || !subscriberId) {
            throw new HTTPException(400, { message: "Missing Parameters: groupId, subscriber_id" });
        }

        logger.debug({ groupId, subscriberId }, `Request:`);

        const subscriber = await this.subscriberService.addToGroup(groupId, subscriberId);

        if (!subscriber) {
            logger.warn({ groupId, subscriberId }, `${this.constructor.name}.${this.addToGroup.name}: Group or subscriber not found`);
            throw new HTTPException(404, { message: "Group or subscriber not found" });
        }

        logger.debug({ subscriber }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.addToGroup.name}`);

        return c.json(subscriber);
    }

    /**
     * DELETE /groups/:group_id/subscribers/:subscriber_id
     * Removes a subscriber from a group; the subscriber itself is kept.
     *
     * @param c - Hono request context; expects `group_id` and `subscriber_id` route params.
     * @returns JSON response with the subscriber and its updated `group_ids`.
     * @throws {HTTPException} 400 if a param is missing.
     * @throws {HTTPException} 404 if the subscriber isn't in the group.
     */
    removeFromGroup = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.removeFromGroup.name}`);

        const groupId = c.req.param('group_id');
        const subscriberId = c.req.param('subscriber_id');

        if (!groupId || !subscriberId) {
            throw new HTTPException(400, { message: "Missing Parameters: groupId, subscriberId" });
        }

        logger.debug({ groupId, subscriberId }, `Request:`);

        const subscriber = await this.subscriberService.removeFromGroup(groupId, subscriberId);

        if (!subscriber) {
            logger.warn({ groupId, subscriberId }, `${this.constructor.name}.${this.removeFromGroup.name}: Subscriber not in group`);
            throw new HTTPException(404, { message: "Subscriber is not in this group" });
        }

        logger.debug({ subscriber }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.removeFromGroup.name}`);

        return c.json(subscriber);
    }
}

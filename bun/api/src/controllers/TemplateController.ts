import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../libs";
import { TemplateService } from "../services";

/**
 * HTTP layer for template-related endpoints. Translates Hono `Context`
 * objects into `TemplateService` calls and maps the results to HTTP
 * responses/errors. Templates are nested under an organization
 * (`/organizations/:organization_id/templates`) for org-wide access, and
 * additionally under a campaign
 * (`/organizations/:organization_id/campaigns/:campaign_id/templates`) for
 * campaign-scoped listing/creation.
 */
export class TemplateController {
    constructor(private templateService: TemplateService) {
    }

    /**
     * GET /organizations/:organization_id/templates
     * Lists every template belonging to an organization, across all campaigns.
     *
     * @param c - Hono request context; expects an `organization_id` route
     * param. Accepts optional `limit` (max rows to return) and `offset`
     * (rows to skip before returning results) query params.
     * @returns JSON array of templates.
     * @throws {HTTPException} 400 if the `organization_id` param is missing.
     */
    getAll = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);

        const organizationId = c.req.param('organization_id');

        if (!organizationId) {
            throw new HTTPException(400, { message: "Missing Parameters: organizationId" });
        }

        const limitParam = c.req.query('limit');
        const offsetParam = c.req.query('offset');
        const limit = limitParam !== undefined ? Number(limitParam) : undefined;
        const offset = offsetParam !== undefined ? Number(offsetParam) : undefined;

        logger.debug({ organizationId, limit, offset }, `Request:`);

        const templates = await this.templateService.getByOrganization(organizationId, { limit, offset });

        logger.debug({ organizationId, count: templates.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

        return c.json(templates);
    }

    /**
     * POST /organizations/:organization_id/templates
     * Creates a new template within an organization.
     *
     * @param c - Hono request context; expects an `organization_id` route
     * param and a JSON body with the template fields.
     * @returns JSON response with the created template.
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

        const template = await this.templateService.create({ ...body, organization_id: organizationId });

        logger.debug({ organizationId, template }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.post.name}`);

        return c.json(template, 201);
    }

    /**
     * GET /organizations/:organization_id/campaigns/:campaign_id/templates
     * Lists templates belonging to a single campaign.
     *
     * @param c - Hono request context; expects a `campaign_id` route param.
     * Accepts optional `limit` (max rows to return) and `offset` (rows to
     * skip before returning results) query params.
     * @returns JSON array of templates.
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

        const templates = await this.templateService.getByCampaign(campaignId, { limit, offset });

        logger.debug({ campaignId, count: templates.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAllByCampaign.name}`);

        return c.json(templates);
    }

    /**
     * POST /organizations/:organization_id/campaigns/:campaign_id/templates
     * Creates a new template within a campaign.
     *
     * @param c - Hono request context; expects `organization_id` and
     * `campaign_id` route params and a JSON body with the template fields.
     * @returns JSON response with the created template.
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

        const template = await this.templateService.create({ ...body, organization_id: organizationId, campaign_id: campaignId });

        logger.debug({ organizationId, campaignId, template }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.postByCampaign.name}`);

        return c.json(template, 201);
    }

    /**
     * GET /organizations/:organization_id/templates/:template_id
     * Fetches a single template by id.
     *
     * @param c - Hono request context; expects a `template_id` route param.
     * @returns JSON response with the template document.
     * @throws {HTTPException} 400 if the `template_id` param is missing.
     * @throws {HTTPException} 404 if no template matches the given id.
     */
    get = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.get.name}`);

        const templateId = c.req.param('template_id');

        if (!templateId) {
            throw new HTTPException(400, { message: "Missing Parameters: templateId" });
        }

        logger.debug({ templateId }, `Request:`);

        const template = await this.templateService.getById(templateId);

        if (!template) {
            logger.warn({ templateId }, `${this.constructor.name}.${this.get.name}: Template not found`);
            throw new HTTPException(404, { message: "Template not found" });
        }

        logger.debug({ template }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.get.name}`);

        return c.json(template);
    }

    /**
     * PATCH /organizations/:organization_id/templates/:template_id
     * Partially updates a template.
     *
     * @param c - Hono request context; expects a `template_id` route param
     * and a JSON body with the fields to update.
     * @returns JSON response with the updated template.
     * @throws {HTTPException} 400 if the `template_id` param is missing.
     * @throws {HTTPException} 404 if no template matches the given id.
     */
    update = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);

        const templateId = c.req.param('template_id');

        if (!templateId) {
            throw new HTTPException(400, { message: "Missing Parameters: templateId" });
        }

        const body = await c.req.json();

        logger.debug({ templateId, body }, `Request:`);

        const template = await this.templateService.update(templateId, body);

        if (!template) {
            logger.warn({ templateId }, `${this.constructor.name}.${this.update.name}: Template not found`);
            throw new HTTPException(404, { message: "Template not found" });
        }

        logger.debug({ template }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

        return c.json(template);
    }

    /**
     * DELETE /organizations/:organization_id/templates/:template_id
     * Deletes a template.
     *
     * @param c - Hono request context; expects a `template_id` route param.
     * @returns JSON response with the deleted template.
     * @throws {HTTPException} 400 if the `template_id` param is missing.
     * @throws {HTTPException} 404 if no template matches the given id.
     */
    delete = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);

        const templateId = c.req.param('template_id');

        if (!templateId) {
            throw new HTTPException(400, { message: "Missing Parameters: templateId" });
        }

        logger.debug({ templateId }, `Request:`);

        const template = await this.templateService.delete(templateId);

        if (!template) {
            logger.warn({ templateId }, `${this.constructor.name}.${this.delete.name}: Template not found`);
            throw new HTTPException(404, { message: "Template not found" });
        }

        logger.debug({ template }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

        return c.json(template);
    }
}

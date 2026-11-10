import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../libs";
import { TemplateService } from "../services";

/**
 * HTTP layer for template-related endpoints. Translates Hono `Context`
 * objects into `TemplateService` calls and maps the results to HTTP
 * responses/errors. Templates are a reusable library at `/templates`; a
 * campaign picks the one it sends with its own `template_id`.
 */
export class TemplateController {
    constructor(private templateService: TemplateService) {
    }

    /**
     * GET /templates
     * Lists every template in the library.
     *
     * @param c - Hono request context; accepts optional `limit` (max rows to return) and `offset`
     * (rows to skip before returning results) query params.
     * @returns JSON array of templates.
     */
    getAll = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);

        const limitParam = c.req.query('limit');
        const offsetParam = c.req.query('offset');
        const limit = limitParam !== undefined ? Number(limitParam) : undefined;
        const offset = offsetParam !== undefined ? Number(offsetParam) : undefined;

        logger.debug({ limit, offset }, `Request:`);

        const templates = await this.templateService.getAll({ limit, offset });

        logger.debug({ count: templates.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

        return c.json(templates);
    }

    /**
     * POST /templates
     * Creates a new template.
     *
     * @param c - Hono request context; expects a JSON body with the template fields.
     * @returns JSON response with the created template.
     */
    post = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.post.name}`);

        const body = await c.req.json();

        logger.debug({ body }, `Request:`);

        const template = await this.templateService.create(body);

        logger.debug({ template }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.post.name}`);

        return c.json(template, 201);
    }

    /**
     * GET /templates/:template_id
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
     * PATCH /templates/:template_id
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
     * DELETE /templates/:template_id
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

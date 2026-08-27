import { asc, eq } from "drizzle-orm";
import { db, logger, DEFAULT_PAGE_SIZE, type PaginationOptions } from "../libs";
import { templateTable } from "../models";

/** Fields accepted when creating a new template row. */
export interface CreateTemplateInput {
    name?: string;
    html_body?: string;
    campaign_id?: string;
    organization_id?: string;
    normalized_name?: string;
    description?: string;
}

/** Fields accepted when partially updating an existing template row. */
export interface UpdateTemplateInput {
    name?: string;
    html_body?: string;
    normalized_name?: string;
    description?: string;
}

/**
 * Data-access layer for `template` rows (the HTML body of a campaign
 * email). Wraps `templateTable` (Drizzle) and adds structured logging
 * around every operation: `info` logs marking method start/end, `debug`
 * logs of the request params and response payload, `warn` if no matching
 * row is found, and `error` (with the full stack via the pino `err`
 * serializer) if the underlying query throws.
 */
export class TemplateService {

    /**
     * Creates a new template row.
     *
     * @param data - Fields for the new template.
     * @returns The created template row.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async create(data: CreateTemplateInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.create.name}`);
        logger.debug({ data }, `Request:`);

        try {
            const [template] = await db.insert(templateTable).values(data).returning();

            logger.debug({ templateId: template!.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.create.name}`);

            return template!;
        } catch (error) {
            logger.error({ err: error, data }, `Exception in ${this.constructor.name}.${this.create.name}: Failed to create template`);
            throw error;
        }
    }

    /**
     * Fetches a single template by id.
     *
     * @param templateId - id of the template.
     * @returns The template row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getById(templateId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.getById.name}`);
        logger.debug({ templateId }, `Request:`);

        try {
            const [template] = await db.select().from(templateTable).where(eq(templateTable.id, templateId));

            if (!template) {
                logger.warn({ templateId }, `${this.constructor.name}.${this.getById.name}: Template not found`);
                return null;
            }

            logger.debug({ templateId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getById.name}`);

            return template;
        } catch (error) {
            logger.error({ err: error, templateId }, `Exception in ${this.constructor.name}.${this.getById.name}: Failed to get template`);
            throw error;
        }
    }

    /**
     * Lists every template belonging to a given campaign, ordered by `id` ascending.
     *
     * @param campaignId - id of the campaign.
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of matching template rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByCampaign(campaignId: string, options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByCampaign.name}`);
        logger.debug({ campaignId, options }, `Request:`);

        try {
            const templates = await db.select().from(templateTable).where(eq(templateTable.campaign_id, campaignId)).orderBy(asc(templateTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ campaignId, count: templates.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByCampaign.name}`);

            return templates;
        } catch (error) {
            logger.error({ err: error, campaignId, options }, `Exception in ${this.constructor.name}.${this.getByCampaign.name}: Failed to get templates for campaign`);
            throw error;
        }
    }

    /**
     * Lists every template belonging to a given organization, ordered by `id` ascending.
     *
     * @param organizationId - id of the organization.
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of matching template rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByOrganization(organizationId: string, options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByOrganization.name}`);
        logger.debug({ organizationId, options }, `Request:`);

        try {
            const templates = await db.select().from(templateTable).where(eq(templateTable.organization_id, organizationId)).orderBy(asc(templateTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ organizationId, count: templates.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByOrganization.name}`);

            return templates;
        } catch (error) {
            logger.error({ err: error, organizationId, options }, `Exception in ${this.constructor.name}.${this.getByOrganization.name}: Failed to get templates for organization`);
            throw error;
        }
    }

    /**
     * Partially updates a template row.
     *
     * @param templateId - id of the template to update.
     * @param data - Fields to update.
     * @returns The updated template row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async update(templateId: string, data: UpdateTemplateInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);
        logger.debug({ templateId, data }, `Request:`);

        try {
            const [template] = await db.update(templateTable).set(data).where(eq(templateTable.id, templateId)).returning();

            if (!template) {
                logger.warn({ templateId }, `${this.constructor.name}.${this.update.name}: Template not found`);
                return null;
            }

            logger.debug({ templateId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

            return template;
        } catch (error) {
            logger.error({ err: error, templateId, data }, `Exception in ${this.constructor.name}.${this.update.name}: Failed to update template`);
            throw error;
        }
    }

    /**
     * Deletes a template row.
     *
     * @param templateId - id of the template to delete.
     * @returns The deleted template row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async delete(templateId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);
        logger.debug({ templateId }, `Request:`);

        try {
            const [template] = await db.delete(templateTable).where(eq(templateTable.id, templateId)).returning();

            if (!template) {
                logger.warn({ templateId }, `${this.constructor.name}.${this.delete.name}: Template not found`);
                return null;
            }

            logger.debug({ templateId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

            return template;
        } catch (error) {
            logger.error({ err: error, templateId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete template`);
            throw error;
        }
    }
}

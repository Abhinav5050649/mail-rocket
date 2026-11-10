import { and, asc, eq, inArray } from "drizzle-orm";
import { db, logger, DEFAULT_PAGE_SIZE, ValidationError, type PaginationOptions } from "../libs";
import { campaignTable, templateTable } from "../models";

/** Fields accepted when creating a new template row. */
export interface CreateTemplateInput {
    name?: string;
    html_body?: string;
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
 * Data-access layer for `template` rows (the reusable library of HTML email
 * bodies that campaigns pick from with `campaign.template_id`). Wraps `templateTable` (Drizzle) and adds structured logging
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
     * Lists every template, ordered by `id` ascending.
     *
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of matching template rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getAll(options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);
        logger.debug({ options }, `Request:`);

        try {
            const templates = await db.select().from(templateTable).orderBy(asc(templateTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ count: templates.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

            return templates;
        } catch (error) {
            logger.error({ err: error, options }, `Exception in ${this.constructor.name}.${this.getAll.name}: Failed to get templates`);
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
     * Deletes a template. Draft campaigns that picked it are left without a
     * template (`template_id` is cleared by the foreign key) and need another
     * before they can be scheduled.
     *
     * @param templateId - id of the template to delete.
     * @returns The deleted template row, or `null` if no match exists.
     * @throws {ValidationError} If a scheduled or sending campaign uses it - that send would have nothing to send.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async delete(templateId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);
        logger.debug({ templateId }, `Request:`);

        try {
            const template = await db.transaction(async (tx) => {
                // A campaign that's queued or mid-send still needs this template's HTML.
                const [inUse] = await tx.select({ name: campaignTable.name }).from(campaignTable)
                    .where(and(eq(campaignTable.template_id, templateId), inArray(campaignTable.status, ["scheduled", "sending"])))
                    .limit(1);
                if (inUse) {
                    throw new ValidationError(`"${inUse.name ?? "A campaign"}" is scheduled or sending with this template. Pick another template for it first.`);
                }
                const [deleted] = await tx.delete(templateTable).where(eq(templateTable.id, templateId)).returning();
                return deleted ?? null;
            });

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

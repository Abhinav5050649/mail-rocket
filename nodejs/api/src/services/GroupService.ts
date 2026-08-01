import { asc, eq } from "drizzle-orm";
import { db, logger, DEFAULT_PAGE_SIZE, type PaginationOptions } from "../libs";
import { groupTable } from "../models";

/** Fields accepted when creating a new group row. */
export interface CreateGroupInput {
    name?: string;
    campaign_id?: string;
    organization_id?: string;
    creator_id?: string;
    normalized_name?: string;
    description?: string;
}

/** Fields accepted when partially updating an existing group row. */
export interface UpdateGroupInput {
    name?: string;
    normalized_name?: string;
    description?: string;
}

/**
 * Data-access layer for `group` rows (recipient lists within a campaign).
 * Wraps `groupTable` (Drizzle) and adds structured logging around every
 * operation: `info` logs marking method start/end, `debug` logs of the
 * request params and response payload, `warn` if no matching row is
 * found, and `error` (with the full stack via the pino `err` serializer)
 * if the underlying query throws.
 */
export class GroupService {

    /**
     * Creates a new group row.
     *
     * @param data - Fields for the new group.
     * @returns The created group row.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async create(data: CreateGroupInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.create.name}`);
        logger.debug({ data }, `Request:`);

        try {
            const [group] = await db.insert(groupTable).values(data).returning();

            logger.debug({ groupId: group!.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.create.name}`);

            return group!;
        } catch (error) {
            logger.error({ err: error, data }, `Exception in ${this.constructor.name}.${this.create.name}: Failed to create group`);
            throw error;
        }
    }

    /**
     * Fetches a single group by id.
     *
     * @param groupId - id of the group.
     * @returns The group row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getById(groupId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.getById.name}`);
        logger.debug({ groupId }, `Request:`);

        try {
            const [group] = await db.select().from(groupTable).where(eq(groupTable.id, groupId));

            if (!group) {
                logger.warn({ groupId }, `${this.constructor.name}.${this.getById.name}: Group not found`);
                return null;
            }

            logger.debug({ groupId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getById.name}`);

            return group;
        } catch (error) {
            logger.error({ err: error, groupId }, `Exception in ${this.constructor.name}.${this.getById.name}: Failed to get group`);
            throw error;
        }
    }

    /**
     * Lists every group belonging to a given campaign, ordered by `id` ascending.
     *
     * @param campaignId - id of the campaign.
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of matching group rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByCampaign(campaignId: string, options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByCampaign.name}`);
        logger.debug({ campaignId, options }, `Request:`);

        try {
            const groups = await db.select().from(groupTable).where(eq(groupTable.campaign_id, campaignId)).orderBy(asc(groupTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ campaignId, count: groups.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByCampaign.name}`);

            return groups;
        } catch (error) {
            logger.error({ err: error, campaignId, options }, `Exception in ${this.constructor.name}.${this.getByCampaign.name}: Failed to get groups for campaign`);
            throw error;
        }
    }

    /**
     * Lists every group belonging to a given organization, ordered by `id` ascending.
     *
     * @param organizationId - id of the organization.
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of matching group rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByOrganization(organizationId: string, options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByOrganization.name}`);
        logger.debug({ organizationId, options }, `Request:`);

        try {
            const groups = await db.select().from(groupTable).where(eq(groupTable.organization_id, organizationId)).orderBy(asc(groupTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ organizationId, count: groups.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByOrganization.name}`);

            return groups;
        } catch (error) {
            logger.error({ err: error, organizationId, options }, `Exception in ${this.constructor.name}.${this.getByOrganization.name}: Failed to get groups for organization`);
            throw error;
        }
    }

    /**
     * Partially updates a group row.
     *
     * @param groupId - id of the group to update.
     * @param data - Fields to update.
     * @returns The updated group row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async update(groupId: string, data: UpdateGroupInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);
        logger.debug({ groupId, data }, `Request:`);

        try {
            const [group] = await db.update(groupTable).set(data).where(eq(groupTable.id, groupId)).returning();

            if (!group) {
                logger.warn({ groupId }, `${this.constructor.name}.${this.update.name}: Group not found`);
                return null;
            }

            logger.debug({ groupId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

            return group;
        } catch (error) {
            logger.error({ err: error, groupId, data }, `Exception in ${this.constructor.name}.${this.update.name}: Failed to update group`);
            throw error;
        }
    }

    /**
     * Deletes a group row.
     *
     * @param groupId - id of the group to delete.
     * @returns The deleted group row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async delete(groupId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);
        logger.debug({ groupId }, `Request:`);

        try {
            const [group] = await db.delete(groupTable).where(eq(groupTable.id, groupId)).returning();

            if (!group) {
                logger.warn({ groupId }, `${this.constructor.name}.${this.delete.name}: Group not found`);
                return null;
            }

            logger.debug({ groupId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

            return group;
        } catch (error) {
            logger.error({ err: error, groupId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete group`);
            throw error;
        }
    }
}

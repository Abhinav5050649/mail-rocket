import { eq } from "drizzle-orm";
import { db, logger } from "../libs";
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
 * operation: an `info` log when the operation starts, `info`/`warn` on
 * completion depending on whether a row was found, and `error` (with the
 * full stack via the pino `err` serializer) if the underlying query throws.
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
        try {
            logger.info({ data }, `${this.constructor.name}.${this.create.name}: Creating group`);

            const [group] = await db.insert(groupTable).values(data).returning();

            logger.info({ groupId: group!.id }, `${this.constructor.name}.${this.create.name}: Group created`);

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
        try {
            logger.info({ groupId }, `${this.constructor.name}.${this.getById.name}: Fetching group`);

            const [group] = await db.select().from(groupTable).where(eq(groupTable.id, groupId));

            if (!group) {
                logger.warn({ groupId }, `${this.constructor.name}.${this.getById.name}: Group not found`);
                return null;
            }

            logger.info({ groupId }, `${this.constructor.name}.${this.getById.name}: Group fetched`);

            return group;
        } catch (error) {
            logger.error({ err: error, groupId }, `Exception in ${this.constructor.name}.${this.getById.name}: Failed to get group`);
            throw error;
        }
    }

    /**
     * Lists every group belonging to a given campaign.
     *
     * @param campaignId - id of the campaign.
     * @returns Array of matching group rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByCampaign(campaignId: string) {
        try {
            logger.info({ campaignId }, `${this.constructor.name}.${this.getByCampaign.name}: Fetching groups for campaign`);

            const groups = await db.select().from(groupTable).where(eq(groupTable.campaign_id, campaignId));

            logger.info({ campaignId, count: groups.length }, `${this.constructor.name}.${this.getByCampaign.name}: Fetched groups for campaign`);

            return groups;
        } catch (error) {
            logger.error({ err: error, campaignId }, `Exception in ${this.constructor.name}.${this.getByCampaign.name}: Failed to get groups for campaign`);
            throw error;
        }
    }

    /**
     * Lists every group belonging to a given organization.
     *
     * @param organizationId - id of the organization.
     * @returns Array of matching group rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByOrganization(organizationId: string) {
        try {
            logger.info({ organizationId }, `${this.constructor.name}.${this.getByOrganization.name}: Fetching groups for organization`);

            const groups = await db.select().from(groupTable).where(eq(groupTable.organization_id, organizationId));

            logger.info({ organizationId, count: groups.length }, `${this.constructor.name}.${this.getByOrganization.name}: Fetched groups for organization`);

            return groups;
        } catch (error) {
            logger.error({ err: error, organizationId }, `Exception in ${this.constructor.name}.${this.getByOrganization.name}: Failed to get groups for organization`);
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
        try {
            logger.info({ groupId, data }, `${this.constructor.name}.${this.update.name}: Updating group`);

            const [group] = await db.update(groupTable).set(data).where(eq(groupTable.id, groupId)).returning();

            if (!group) {
                logger.warn({ groupId }, `${this.constructor.name}.${this.update.name}: Group not found`);
                return null;
            }

            logger.info({ groupId }, `${this.constructor.name}.${this.update.name}: Group updated`);

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
        try {
            logger.info({ groupId }, `${this.constructor.name}.${this.delete.name}: Deleting group`);

            const [group] = await db.delete(groupTable).where(eq(groupTable.id, groupId)).returning();

            if (!group) {
                logger.warn({ groupId }, `${this.constructor.name}.${this.delete.name}: Group not found`);
                return null;
            }

            logger.info({ groupId }, `${this.constructor.name}.${this.delete.name}: Group deleted`);

            return group;
        } catch (error) {
            logger.error({ err: error, groupId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete group`);
            throw error;
        }
    }
}

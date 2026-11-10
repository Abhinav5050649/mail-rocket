import { and, asc, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import { db, logger, DEFAULT_PAGE_SIZE, ValidationError, type PaginationOptions } from "../libs";
import { campaignGroupTable, campaignTable, groupSubscriberTable, groupTable } from "../models";

/**
 * `"group"."id"`, always table-qualified, so the correlated count below binds
 * to the outer group row rather than to `group_subscriber`'s own columns.
 */
const outerGroupId = sql`${sql.identifier("group")}.${sql.identifier("id")}`;

/**
 * Every group column plus `subscriber_count`: how many subscribers are in the
 * group, counted in the same query. Every group read returns this shape, so
 * a campaign's audience picker can show each group's size.
 */
const groupWithCount = {
    ...getTableColumns(groupTable),
    subscriber_count: sql<number>`(
        select count(*)::int from ${groupSubscriberTable}
        where ${groupSubscriberTable.group_id} = ${outerGroupId}
    )`.as("subscriber_count"),
};

/** Fields accepted when creating a new group row. */
export interface CreateGroupInput {
    name?: string;
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
 * Data-access layer for `group` rows (reusable subscriber lists that any
 * number of campaigns can send to). Every read returns the group with its
 * `subscriber_count`.
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
     * @returns The created group, with a `subscriber_count` of 0.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async create(data: CreateGroupInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.create.name}`);
        logger.debug({ data }, `Request:`);

        try {
            const [inserted] = await db.insert(groupTable).values(data).returning();
            // A brand-new group has no members yet; no need to count them.
            const group = { ...inserted!, subscriber_count: 0 };

            logger.debug({ groupId: group.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.create.name}`);

            return group;
        } catch (error) {
            logger.error({ err: error, data }, `Exception in ${this.constructor.name}.${this.create.name}: Failed to create group`);
            throw error;
        }
    }

    /**
     * Fetches a single group by id.
     *
     * @param groupId - id of the group.
     * @returns The group with its `subscriber_count`, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getById(groupId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.getById.name}`);
        logger.debug({ groupId }, `Request:`);

        try {
            const [group] = await db.select(groupWithCount).from(groupTable).where(eq(groupTable.id, groupId));

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
     * Lists the groups a campaign sends to, ordered by `id` ascending.
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
            // Only groups linked to the campaign through `campaign_group`.
            const linked = db.select({ id: campaignGroupTable.group_id }).from(campaignGroupTable).where(eq(campaignGroupTable.campaign_id, campaignId));
            const groups = await db.select(groupWithCount).from(groupTable).where(inArray(groupTable.id, linked)).orderBy(asc(groupTable.id))
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
     * Lists every group, ordered by `id` ascending.
     *
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of groups, each with its `subscriber_count` (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getAll(options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);
        logger.debug({ options }, `Request:`);

        try {
            const groups = await db.select(groupWithCount).from(groupTable).orderBy(asc(groupTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ count: groups.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

            return groups;
        } catch (error) {
            logger.error({ err: error, options }, `Exception in ${this.constructor.name}.${this.getAll.name}: Failed to get groups`);
            throw error;
        }
    }

    /**
     * Partially updates a group row.
     *
     * @param groupId - id of the group to update.
     * @param data - Fields to update.
     * @returns The updated group with its `subscriber_count`, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async update(groupId: string, data: UpdateGroupInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);
        logger.debug({ groupId, data }, `Request:`);

        try {
            const [updated] = await db.update(groupTable).set(data).where(eq(groupTable.id, groupId)).returning({ id: groupTable.id });

            if (!updated) {
                logger.warn({ groupId }, `${this.constructor.name}.${this.update.name}: Group not found`);
                return null;
            }

            // Re-read so the response carries the same `subscriber_count` as every other group read.
            const [group] = await db.select(groupWithCount).from(groupTable).where(eq(groupTable.id, groupId));

            logger.debug({ groupId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

            return group;
        } catch (error) {
            logger.error({ err: error, groupId, data }, `Exception in ${this.constructor.name}.${this.update.name}: Failed to update group`);
            throw error;
        }
    }

    /**
     * Deletes a group. Its memberships and campaign links go with it; the
     * subscribers themselves stay.
     *
     * @param groupId - id of the group to delete.
     * @returns The deleted group row, or `null` if no match exists.
     * @throws {ValidationError} If a scheduled or sending campaign sends to it - deleting it would silently shrink that send.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async delete(groupId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);
        logger.debug({ groupId }, `Request:`);

        try {
            const group = await db.transaction(async (tx) => {
                // A campaign that's queued or mid-send would quietly lose this audience.
                const [inUse] = await tx.select({ name: campaignTable.name }).from(campaignGroupTable)
                    .innerJoin(campaignTable, eq(campaignTable.id, campaignGroupTable.campaign_id))
                    .where(and(eq(campaignGroupTable.group_id, groupId), inArray(campaignTable.status, ["scheduled", "sending"])))
                    .limit(1);
                if (inUse) {
                    throw new ValidationError(`"${inUse.name ?? "A campaign"}" is scheduled or sending to this group. Remove the group from that campaign first.`);
                }
                const [deleted] = await tx.delete(groupTable).where(eq(groupTable.id, groupId)).returning();
                return deleted ?? null;
            });

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

import { and, asc, eq, getTableColumns, inArray, or, sql, type SQL } from "drizzle-orm";
import { db, logger, DEFAULT_PAGE_SIZE, ValidationError, type PaginationOptions } from "../libs";
import { groupRecipientTable, groupTable, recipientsTable } from "../models";

/** Fields accepted when creating a new recipient row. */
export interface CreateRecipientInput {
    first_name?: string;
    last_name?: string;
    normalized_name?: string;
    email_id?: string;
    /** Groups the recipient joins; each id must exist. */
    group_ids?: string[];
    campaign_id?: string;
    description?: string;
}

/** Fields accepted when partially updating an existing recipient row. */
export interface UpdateRecipientInput {
    first_name?: string;
    last_name?: string;
    normalized_name?: string;
    email_id?: string;
    campaign_id?: string | null;
    /** When present, replaces the recipient's groups with exactly these. */
    group_ids?: string[];
    description?: string;
}

/**
 * `"recipients"."id"`, always table-qualified. Drizzle renders a column
 * unqualified in a single-table select, and inside a correlated subquery an
 * unqualified `id` would bind to the subquery's own table instead.
 */
export const outerRecipientId = sql`${sql.identifier("recipients")}.${sql.identifier("id")}`;

/**
 * Every recipient column plus `group_ids`: the ids of the groups the
 * recipient is in, oldest membership first, aggregated from
 * `group_recipient` in the same query (an empty array when there are none).
 */
const recipientWithGroups = {
    ...getTableColumns(recipientsTable),
    group_ids: sql<string[]>`coalesce((
        select array_agg(${groupRecipientTable.group_id} order by ${groupRecipientTable.created_at}, ${groupRecipientTable.group_id})
        from ${groupRecipientTable}
        where ${groupRecipientTable.recipient_id} = ${outerRecipientId}
    ), '{}')`.as("group_ids"),
};

/**
 * Who a campaign sends to: recipients linked to it directly, plus everyone
 * in a group linked to it. A recipient matching both ways is still one row,
 * so each person is sent to once.
 *
 * @param campaignId - id of the campaign.
 * @returns A `where` condition on `recipientsTable`.
 */
export const campaignAudience = (campaignId: string): SQL =>
    or(
        eq(recipientsTable.campaign_id, campaignId),
        inArray(
            recipientsTable.id,
            db.select({ id: groupRecipientTable.recipient_id })
                .from(groupRecipientTable)
                .innerJoin(groupTable, eq(groupTable.id, groupRecipientTable.group_id))
                .where(eq(groupTable.campaign_id, campaignId)),
        ),
    )!;

/** Transaction handle, so membership writes join the caller's transaction. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Data-access layer for `recipients` rows (people a campaign can send to)
 * and their group memberships in `group_recipient`. Every read returns the
 * recipient with its `group_ids`. Follows the same logging conventions as
 * every other service: `info` start/end, `debug` request/response, `warn`
 * on not-found, `error` with the full stack before re-throwing.
 */
export class RecipientService {

    /**
     * Throws if any of `groupIds` doesn't exist, so a typo'd id is a clear
     * 400 rather than a foreign-key 500.
     *
     * @throws {ValidationError} Naming the unknown ids.
     */
    private async assertGroupsExist(tx: Tx, groupIds: string[]) {
        if (groupIds.length === 0) return;
        const found = await tx.select({ id: groupTable.id }).from(groupTable).where(inArray(groupTable.id, groupIds));
        const unknown = groupIds.filter((id) => !found.some((row) => row.id === id));
        if (unknown.length > 0) throw new ValidationError(`Unknown group id(s): ${unknown.join(", ")}`);
    }

    /** Replaces a recipient's memberships with exactly `groupIds` (deduplicated). */
    private async setGroups(tx: Tx, recipientId: string, groupIds: string[]) {
        const unique = [...new Set(groupIds)];
        await this.assertGroupsExist(tx, unique);
        await tx.delete(groupRecipientTable).where(eq(groupRecipientTable.recipient_id, recipientId));
        if (unique.length > 0) {
            await tx.insert(groupRecipientTable).values(unique.map((group_id) => ({ group_id, recipient_id: recipientId })));
        }
    }

    /** Reads one recipient with its `group_ids` inside `tx`. */
    private async readWithGroups(tx: Tx, recipientId: string) {
        const [recipient] = await tx.select(recipientWithGroups).from(recipientsTable).where(eq(recipientsTable.id, recipientId));
        return recipient ?? null;
    }

    /**
     * Creates a new recipient and its group memberships, together.
     *
     * @param data - Fields for the new recipient, plus optional `group_ids`.
     * @returns The created recipient with its `group_ids`.
     * @throws {ValidationError} If a group id doesn't exist.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async create(data: CreateRecipientInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.create.name}`);
        logger.debug({ data }, `Request:`);

        try {
            const { group_ids, ...fields } = data;
            const recipient = await db.transaction(async (tx) => {
                const [inserted] = await tx.insert(recipientsTable).values(fields).returning();
                await this.setGroups(tx, inserted!.id, group_ids ?? []);
                return (await this.readWithGroups(tx, inserted!.id))!;
            });

            logger.debug({ recipientId: recipient.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.create.name}`);

            return recipient;
        } catch (error) {
            logger.error({ err: error, data }, `Exception in ${this.constructor.name}.${this.create.name}: Failed to create recipient`);
            throw error;
        }
    }

    /**
     * Fetches a single recipient by id.
     *
     * @param recipientId - id of the recipient.
     * @returns The recipient with its `group_ids`, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getById(recipientId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.getById.name}`);
        logger.debug({ recipientId }, `Request:`);

        try {
            const [recipient] = await db.select(recipientWithGroups).from(recipientsTable).where(eq(recipientsTable.id, recipientId));

            if (!recipient) {
                logger.warn({ recipientId }, `${this.constructor.name}.${this.getById.name}: Recipient not found`);
                return null;
            }

            logger.debug({ recipientId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getById.name}`);

            return recipient;
        } catch (error) {
            logger.error({ err: error, recipientId }, `Exception in ${this.constructor.name}.${this.getById.name}: Failed to get recipient`);
            throw error;
        }
    }

    /**
     * Lists the members of a group, ordered by recipient `id` ascending.
     *
     * @param groupId - id of the group.
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of member recipients with their `group_ids` (empty if none).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByGroup(groupId: string, options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByGroup.name}`);
        logger.debug({ groupId, options }, `Request:`);

        try {
            const recipients = await db.select(recipientWithGroups).from(recipientsTable)
                .innerJoin(groupRecipientTable, eq(groupRecipientTable.recipient_id, recipientsTable.id))
                .where(eq(groupRecipientTable.group_id, groupId))
                .orderBy(asc(recipientsTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ groupId, count: recipients.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByGroup.name}`);

            return recipients;
        } catch (error) {
            logger.error({ err: error, groupId, options }, `Exception in ${this.constructor.name}.${this.getByGroup.name}: Failed to get recipients for group`);
            throw error;
        }
    }

    /**
     * Lists every recipient, ordered by `id` ascending.
     *
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of recipients with their `group_ids` (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getAll(options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);
        logger.debug({ options }, `Request:`);

        try {
            const recipients = await db.select(recipientWithGroups).from(recipientsTable).orderBy(asc(recipientsTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ count: recipients.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

            return recipients;
        } catch (error) {
            logger.error({ err: error, options }, `Exception in ${this.constructor.name}.${this.getAll.name}: Failed to get recipients`);
            throw error;
        }
    }

    /**
     * Lists a campaign's audience - everyone it would send to: recipients
     * linked to it directly plus members of its linked groups, each once -
     * ordered by `id` ascending.
     *
     * @param campaignId - id of the campaign.
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of recipients with their `group_ids` (empty if none).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByCampaign(campaignId: string, options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByCampaign.name}`);
        logger.debug({ campaignId, options }, `Request:`);

        try {
            const recipients = await db.select(recipientWithGroups).from(recipientsTable).where(campaignAudience(campaignId)).orderBy(asc(recipientsTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ campaignId, count: recipients.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByCampaign.name}`);

            return recipients;
        } catch (error) {
            logger.error({ err: error, campaignId, options }, `Exception in ${this.constructor.name}.${this.getByCampaign.name}: Failed to get recipients for campaign`);
            throw error;
        }
    }

    /**
     * Partially updates a recipient. `group_ids`, when present, replaces the
     * recipient's memberships in the same transaction.
     *
     * @param recipientId - id of the recipient to update.
     * @param data - Fields to update.
     * @returns The updated recipient with its `group_ids`, or `null` if no match exists.
     * @throws {ValidationError} If a group id doesn't exist.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async update(recipientId: string, data: UpdateRecipientInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);
        logger.debug({ recipientId, data }, `Request:`);

        try {
            const { group_ids, ...fields } = data;
            const recipient = await db.transaction(async (tx) => {
                // Drizzle refuses an empty `set`, so a groups-only update just checks the row exists.
                const [row] = Object.keys(fields).length > 0
                    ? await tx.update(recipientsTable).set(fields).where(eq(recipientsTable.id, recipientId)).returning({ id: recipientsTable.id })
                    : await tx.select({ id: recipientsTable.id }).from(recipientsTable).where(eq(recipientsTable.id, recipientId));
                if (!row) return null;

                if (group_ids !== undefined) await this.setGroups(tx, recipientId, group_ids);
                return this.readWithGroups(tx, recipientId);
            });

            if (!recipient) {
                logger.warn({ recipientId }, `${this.constructor.name}.${this.update.name}: Recipient not found`);
                return null;
            }

            logger.debug({ recipientId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

            return recipient;
        } catch (error) {
            logger.error({ err: error, recipientId, data }, `Exception in ${this.constructor.name}.${this.update.name}: Failed to update recipient`);
            throw error;
        }
    }

    /**
     * Adds an existing recipient to a group. Adding someone already in the
     * group is a no-op, not an error.
     *
     * @param groupId - id of the group.
     * @param recipientId - id of the recipient.
     * @returns The recipient with its updated `group_ids`, or `null` if the group or recipient doesn't exist.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async addToGroup(groupId: string, recipientId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.addToGroup.name}`);
        logger.debug({ groupId, recipientId }, `Request:`);

        try {
            const recipient = await db.transaction(async (tx) => {
                const [group] = await tx.select({ id: groupTable.id }).from(groupTable).where(eq(groupTable.id, groupId));
                const existing = await this.readWithGroups(tx, recipientId);
                if (!group || !existing) return null;

                await tx.insert(groupRecipientTable).values({ group_id: groupId, recipient_id: recipientId }).onConflictDoNothing();
                return this.readWithGroups(tx, recipientId);
            });

            if (!recipient) {
                logger.warn({ groupId, recipientId }, `${this.constructor.name}.${this.addToGroup.name}: Group or recipient not found`);
                return null;
            }

            logger.debug({ groupId, recipientId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.addToGroup.name}`);

            return recipient;
        } catch (error) {
            logger.error({ err: error, groupId, recipientId }, `Exception in ${this.constructor.name}.${this.addToGroup.name}: Failed to add recipient to group`);
            throw error;
        }
    }

    /**
     * Removes a recipient from a group. The recipient itself is kept.
     *
     * @param groupId - id of the group.
     * @param recipientId - id of the recipient.
     * @returns The recipient with its updated `group_ids`, or `null` if they weren't in the group.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async removeFromGroup(groupId: string, recipientId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.removeFromGroup.name}`);
        logger.debug({ groupId, recipientId }, `Request:`);

        try {
            const recipient = await db.transaction(async (tx) => {
                const [removed] = await tx.delete(groupRecipientTable)
                    .where(and(eq(groupRecipientTable.group_id, groupId), eq(groupRecipientTable.recipient_id, recipientId)))
                    .returning({ id: groupRecipientTable.id });
                if (!removed) return null;
                return this.readWithGroups(tx, recipientId);
            });

            if (!recipient) {
                logger.warn({ groupId, recipientId }, `${this.constructor.name}.${this.removeFromGroup.name}: Recipient not in group`);
                return null;
            }

            logger.debug({ groupId, recipientId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.removeFromGroup.name}`);

            return recipient;
        } catch (error) {
            logger.error({ err: error, groupId, recipientId }, `Exception in ${this.constructor.name}.${this.removeFromGroup.name}: Failed to remove recipient from group`);
            throw error;
        }
    }

    /**
     * Deletes a recipient. Its group memberships go with it (cascade).
     *
     * @param recipientId - id of the recipient to delete.
     * @returns The deleted recipient row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async delete(recipientId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);
        logger.debug({ recipientId }, `Request:`);

        try {
            const [recipient] = await db.delete(recipientsTable).where(eq(recipientsTable.id, recipientId)).returning();

            if (!recipient) {
                logger.warn({ recipientId }, `${this.constructor.name}.${this.delete.name}: Recipient not found`);
                return null;
            }

            logger.debug({ recipientId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

            return recipient;
        } catch (error) {
            logger.error({ err: error, recipientId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete recipient`);
            throw error;
        }
    }
}

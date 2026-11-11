import { and, asc, eq, getTableColumns, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { chunkArray, db, logger, DEFAULT_PAGE_SIZE, ValidationError, type PaginationOptions } from "../libs";
import { campaignDeliveryTable, campaignGroupTable, campaignSubscriberTable, groupSubscriberTable, groupTable, subscribersTable } from "../models";

/** Fields accepted when creating a new subscriber row. */
export interface CreateSubscriberInput {
    first_name?: string;
    last_name?: string;
    normalized_name?: string;
    email_id?: string;
    /** Groups the subscriber joins; each id must exist. */
    group_ids?: string[];
    description?: string;
}

/** Fields accepted when partially updating an existing subscriber row. */
export interface UpdateSubscriberInput {
    first_name?: string;
    last_name?: string;
    normalized_name?: string;
    email_id?: string;
    /** When present, replaces the subscriber's groups with exactly these. */
    group_ids?: string[];
    description?: string;
}

/** One row of a bulk import: a person to add, matched to existing subscribers by email. */
export interface ImportSubscriberRow {
    email_id?: string;
    first_name?: string;
    last_name?: string;
}

/** One import row that wasn't imported: its 1-based position, the email it carried, and why. */
export interface ImportSkip {
    row: number;
    email_id: string;
    reason: string;
}

/** What a bulk import did. Mirrors `SubscriberImportResult` in `@mail-rocket/shared`. */
export interface ImportResult {
    /** New subscribers created. */
    created: number;
    /** Rows matched to a subscriber that already existed (reused, not changed). */
    existing: number;
    /** Groups every imported subscriber is now in. */
    group_ids: string[];
    /** Rows that weren't imported. */
    skipped: ImportSkip[];
}

/** What a bulk delete did. Mirrors `SubscriberBulkDeleteResult` in `@mail-rocket/shared`. */
export interface BulkDeleteResult {
    /** Subscribers deleted. */
    deleted_ids: string[];
    /** Subscribers kept because they have send history (`campaign_delivery` rows). */
    blocked_ids: string[];
}

/** Who a bulk group removal took out. Mirrors `GroupMembersRemoveResult` in `@mail-rocket/shared`. */
export interface BulkRemoveResult {
    /** Subscribers no longer in the group. */
    removed_ids: string[];
}

/** A pragmatic email shape check (something@something.tld, no spaces), not full RFC 5322. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Rows per statement during an import. Keeps every query well under
 * Postgres's 65,535 bind-parameter limit, whatever the import's size.
 */
const IMPORT_CHUNK_SIZE = 500;

/** `lower("subscribers"."email_id")`: emails are matched case-insensitively. */
const lowerEmail = sql<string>`lower(${subscribersTable.email_id})`;

/**
 * `"subscribers"."id"`, always table-qualified. Drizzle renders a column
 * unqualified in a single-table select, and inside a correlated subquery an
 * unqualified `id` would bind to the subquery's own table instead.
 */
export const outerSubscriberId = sql`${sql.identifier("subscribers")}.${sql.identifier("id")}`;

/**
 * Every subscriber column plus `group_ids`: the ids of the groups the
 * subscriber is in, oldest membership first, aggregated from
 * `group_subscriber` in the same query (an empty array when there are none).
 */
const subscriberWithGroups = {
    ...getTableColumns(subscribersTable),
    group_ids: sql<string[]>`coalesce((
        select array_agg(${groupSubscriberTable.group_id} order by ${groupSubscriberTable.created_at}, ${groupSubscriberTable.group_id})
        from ${groupSubscriberTable}
        where ${groupSubscriberTable.subscriber_id} = ${outerSubscriberId}
    ), '{}')`.as("group_ids"),
};

/**
 * Who a campaign sends to: the subscribers it picked individually
 * (`campaign_subscriber`), plus everyone in the groups it sends to
 * (`campaign_group` -> `group_subscriber`). A subscriber matching both ways,
 * or through several groups, is still one row, so each person is sent to once.
 *
 * @param campaignId - id of the campaign.
 * @returns A `where` condition on `subscribersTable`.
 */
export const campaignAudience = (campaignId: string): SQL =>
    or(
        // Picked individually.
        inArray(
            subscribersTable.id,
            db.select({ id: campaignSubscriberTable.subscriber_id })
                .from(campaignSubscriberTable)
                .where(eq(campaignSubscriberTable.campaign_id, campaignId)),
        ),
        // A member of one of the campaign's groups.
        inArray(
            subscribersTable.id,
            db.select({ id: groupSubscriberTable.subscriber_id })
                .from(groupSubscriberTable)
                .innerJoin(campaignGroupTable, eq(campaignGroupTable.group_id, groupSubscriberTable.group_id))
                .where(eq(campaignGroupTable.campaign_id, campaignId)),
        ),
    )!;

/** Transaction handle, so membership writes join the caller's transaction. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Data-access layer for `subscribers` rows (people a campaign can send to)
 * and their group memberships in `group_subscriber`. Every read returns the
 * subscriber with its `group_ids`. Follows the same logging conventions as
 * every other service: `info` start/end, `debug` request/response, `warn`
 * on not-found, `error` with the full stack before re-throwing.
 */
export class SubscriberService {

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

    /** Replaces a subscriber's memberships with exactly `groupIds` (deduplicated). */
    private async setGroups(tx: Tx, subscriberId: string, groupIds: string[]) {
        const unique = [...new Set(groupIds)];
        await this.assertGroupsExist(tx, unique);
        await tx.delete(groupSubscriberTable).where(eq(groupSubscriberTable.subscriber_id, subscriberId));
        if (unique.length > 0) {
            await tx.insert(groupSubscriberTable).values(unique.map((group_id) => ({ group_id, subscriber_id: subscriberId })));
        }
    }

    /** Reads one subscriber with its `group_ids` inside `tx`. */
    private async readWithGroups(tx: Tx, subscriberId: string) {
        const [subscriber] = await tx.select(subscriberWithGroups).from(subscribersTable).where(eq(subscribersTable.id, subscriberId));
        return subscriber ?? null;
    }

    /**
     * Creates a new subscriber and its group memberships, together.
     *
     * @param data - Fields for the new subscriber, plus optional `group_ids`.
     * @returns The created subscriber with its `group_ids`.
     * @throws {ValidationError} If a group id doesn't exist.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async create(data: CreateSubscriberInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.create.name}`);
        logger.debug({ data }, `Request:`);

        try {
            const { group_ids, ...fields } = data;
            const subscriber = await db.transaction(async (tx) => {
                const [inserted] = await tx.insert(subscribersTable).values(fields).returning();
                await this.setGroups(tx, inserted!.id, group_ids ?? []);
                return (await this.readWithGroups(tx, inserted!.id))!;
            });

            logger.debug({ subscriberId: subscriber.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.create.name}`);

            return subscriber;
        } catch (error) {
            logger.error({ err: error, data }, `Exception in ${this.constructor.name}.${this.create.name}: Failed to create subscriber`);
            throw error;
        }
    }

    /**
     * Imports many subscribers at once (e.g. from a CSV) and puts every one
     * of them in `groupIds`. Rows are matched to existing subscribers by email,
     * case-insensitively: a match is reused as-is (its name isn't overwritten)
     * and only gains the groups, so re-importing the same list never creates
     * duplicates. Rows without a valid email, and repeats of an email seen
     * earlier in the same import, are skipped and reported rather than failing
     * the whole import. Everything else happens in one transaction: either all
     * the subscribers and memberships are written, or none are.
     *
     * @param rows - The people to import, in their original order.
     * @param groupIds - Groups every imported subscriber joins; each must exist.
     * @returns Counts of created/reused subscribers, the groups, and the skipped rows.
     * @throws {ValidationError} If a group id doesn't exist.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async importMany(rows: ImportSubscriberRow[], groupIds: string[]): Promise<ImportResult> {
        logger.info(`Start method: ${this.constructor.name}.${this.importMany.name}`);
        // Only counts: an import can carry thousands of rows.
        logger.debug({ rowCount: rows.length, groupIds }, `Request:`);

        try {
            const skipped: ImportSkip[] = [];
            // Valid rows keyed by lowercased email, so a repeat is caught and existing rows can be matched.
            const valid = new Map<string, { email_id: string; first_name?: string; last_name?: string }>();

            rows.forEach((row, index) => {
                const email = (row.email_id ?? "").trim();
                const key = email.toLowerCase();
                // Rows are reported 1-based, as a person counts them.
                const position = index + 1;

                if (!email) {
                    skipped.push({ row: position, email_id: email, reason: "Missing email" });
                } else if (!EMAIL_PATTERN.test(email)) {
                    skipped.push({ row: position, email_id: email, reason: "Invalid email" });
                } else if (valid.has(key)) {
                    skipped.push({ row: position, email_id: email, reason: "Duplicate of an earlier row" });
                } else {
                    // Blank names are stored as null (left out), not as empty strings.
                    valid.set(key, {
                        email_id: email,
                        first_name: row.first_name?.trim() || undefined,
                        last_name: row.last_name?.trim() || undefined,
                    });
                }
            });

            const uniqueGroupIds = [...new Set(groupIds)];

            const counts = await db.transaction(async (tx) => {
                // Checked first, so an unknown group fails before anything is written.
                await this.assertGroupsExist(tx, uniqueGroupIds);

                // Existing subscribers for the imported emails, lowercased email -> id.
                const existingIds = new Map<string, string>();
                for (const emails of chunkArray([...valid.keys()], IMPORT_CHUNK_SIZE)) {
                    const found = await tx.select({ id: subscribersTable.id, email: lowerEmail }).from(subscribersTable)
                        .where(inArray(lowerEmail, emails))
                        .orderBy(asc(subscribersTable.id));
                    // If the email was already on several subscribers, reuse just one of them.
                    for (const match of found) {
                        if (!existingIds.has(match.email)) existingIds.set(match.email, match.id);
                    }
                }

                // Everyone not already a subscriber is created, in chunks.
                const toCreate = [...valid].filter(([key]) => !existingIds.has(key)).map(([, fields]) => fields);
                const createdIds: string[] = [];
                for (const batch of chunkArray(toCreate, IMPORT_CHUNK_SIZE)) {
                    const inserted = await tx.insert(subscribersTable).values(batch).returning({ id: subscribersTable.id });
                    createdIds.push(...inserted.map((row) => row.id));
                }

                // Every imported subscriber, new or existing, joins every group; existing memberships are left alone.
                const subscriberIds = [...existingIds.values(), ...createdIds];
                const memberships = subscriberIds.flatMap((subscriber_id) => uniqueGroupIds.map((group_id) => ({ group_id, subscriber_id })));
                for (const batch of chunkArray(memberships, IMPORT_CHUNK_SIZE)) {
                    await tx.insert(groupSubscriberTable).values(batch).onConflictDoNothing();
                }

                return { created: createdIds.length, existing: existingIds.size };
            });

            const result: ImportResult = { ...counts, group_ids: uniqueGroupIds, skipped };

            logger.debug({ created: result.created, existing: result.existing, skipped: skipped.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.importMany.name}`);

            return result;
        } catch (error) {
            logger.error({ err: error, rowCount: rows.length, groupIds }, `Exception in ${this.constructor.name}.${this.importMany.name}: Failed to import subscribers`);
            throw error;
        }
    }

    /**
     * Fetches a single subscriber by id.
     *
     * @param subscriberId - id of the subscriber.
     * @returns The subscriber with its `group_ids`, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getById(subscriberId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.getById.name}`);
        logger.debug({ subscriberId }, `Request:`);

        try {
            const [subscriber] = await db.select(subscriberWithGroups).from(subscribersTable).where(eq(subscribersTable.id, subscriberId));

            if (!subscriber) {
                logger.warn({ subscriberId }, `${this.constructor.name}.${this.getById.name}: Subscriber not found`);
                return null;
            }

            logger.debug({ subscriberId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getById.name}`);

            return subscriber;
        } catch (error) {
            logger.error({ err: error, subscriberId }, `Exception in ${this.constructor.name}.${this.getById.name}: Failed to get subscriber`);
            throw error;
        }
    }

    /**
     * Fetches the subscriber a sent email (a `campaign_delivery` row) went
     * to. Backs the unsubscribe page, whose link carries the delivery id.
     *
     * @param deliveryId - id of the `campaign_delivery` row.
     * @returns The subscriber row, or `null` if no delivery (or subscriber) matches.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByDelivery(deliveryId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByDelivery.name}`);
        logger.debug({ deliveryId }, `Request:`);

        try {
            const [row] = await db.select({ subscriber: subscribersTable }).from(campaignDeliveryTable)
                .innerJoin(subscribersTable, eq(subscribersTable.id, campaignDeliveryTable.subscriber_id))
                .where(eq(campaignDeliveryTable.id, deliveryId));

            if (!row) {
                logger.warn({ deliveryId }, `${this.constructor.name}.${this.getByDelivery.name}: Subscriber not found`);
                return null;
            }

            logger.debug({ deliveryId, subscriberId: row.subscriber.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByDelivery.name}`);

            return row.subscriber;
        } catch (error) {
            logger.error({ err: error, deliveryId }, `Exception in ${this.constructor.name}.${this.getByDelivery.name}: Failed to get subscriber by delivery`);
            throw error;
        }
    }

    /**
     * Unsubscribes whoever a sent email went to: sets the subscriber's
     * `unsubscribed_at` (so no future send includes them) and the delivery's
     * (so the campaign's stats count it). Only the first unsubscribe is kept,
     * so repeating it changes nothing.
     *
     * @param deliveryId - id of the `campaign_delivery` row whose link was used.
     * @returns The subscriber row, or `null` if no delivery (or subscriber) matches.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async unsubscribe(deliveryId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.unsubscribe.name}`);
        logger.debug({ deliveryId }, `Request:`);

        try {
            const subscriber = await db.transaction(async (tx) => {
                const [delivery] = await tx.select({ subscriberId: campaignDeliveryTable.subscriber_id }).from(campaignDeliveryTable)
                    .where(eq(campaignDeliveryTable.id, deliveryId));
                if (!delivery?.subscriberId) return null;

                // `isNull` keeps the first unsubscribe time instead of overwriting it on a repeat.
                const now = new Date();
                await tx.update(campaignDeliveryTable).set({ unsubscribed_at: now })
                    .where(and(eq(campaignDeliveryTable.id, deliveryId), isNull(campaignDeliveryTable.unsubscribed_at)));
                await tx.update(subscribersTable).set({ unsubscribed_at: now })
                    .where(and(eq(subscribersTable.id, delivery.subscriberId), isNull(subscribersTable.unsubscribed_at)));

                const [updated] = await tx.select().from(subscribersTable).where(eq(subscribersTable.id, delivery.subscriberId));
                return updated ?? null;
            });

            if (!subscriber) {
                logger.warn({ deliveryId }, `${this.constructor.name}.${this.unsubscribe.name}: Subscriber not found`);
                return null;
            }

            logger.debug({ deliveryId, subscriberId: subscriber.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.unsubscribe.name}`);

            return subscriber;
        } catch (error) {
            logger.error({ err: error, deliveryId }, `Exception in ${this.constructor.name}.${this.unsubscribe.name}: Failed to unsubscribe`);
            throw error;
        }
    }

    /**
     * Lists the members of a group, ordered by subscriber `id` ascending.
     *
     * @param groupId - id of the group.
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of member subscribers with their `group_ids` (empty if none).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByGroup(groupId: string, options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByGroup.name}`);
        logger.debug({ groupId, options }, `Request:`);

        try {
            const subscribers = await db.select(subscriberWithGroups).from(subscribersTable)
                .innerJoin(groupSubscriberTable, eq(groupSubscriberTable.subscriber_id, subscribersTable.id))
                .where(eq(groupSubscriberTable.group_id, groupId))
                .orderBy(asc(subscribersTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ groupId, count: subscribers.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByGroup.name}`);

            return subscribers;
        } catch (error) {
            logger.error({ err: error, groupId, options }, `Exception in ${this.constructor.name}.${this.getByGroup.name}: Failed to get subscribers for group`);
            throw error;
        }
    }

    /**
     * Lists every subscriber, ordered by `id` ascending.
     *
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of subscribers with their `group_ids` (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getAll(options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);
        logger.debug({ options }, `Request:`);

        try {
            const subscribers = await db.select(subscriberWithGroups).from(subscribersTable).orderBy(asc(subscribersTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ count: subscribers.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

            return subscribers;
        } catch (error) {
            logger.error({ err: error, options }, `Exception in ${this.constructor.name}.${this.getAll.name}: Failed to get subscribers`);
            throw error;
        }
    }

    /**
     * Lists a campaign's audience - everyone it would send to: subscribers
     * linked to it directly plus members of its linked groups, each once -
     * ordered by `id` ascending.
     *
     * @param campaignId - id of the campaign.
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of subscribers with their `group_ids` (empty if none).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByCampaign(campaignId: string, options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByCampaign.name}`);
        logger.debug({ campaignId, options }, `Request:`);

        try {
            const subscribers = await db.select(subscriberWithGroups).from(subscribersTable).where(campaignAudience(campaignId)).orderBy(asc(subscribersTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ campaignId, count: subscribers.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByCampaign.name}`);

            return subscribers;
        } catch (error) {
            logger.error({ err: error, campaignId, options }, `Exception in ${this.constructor.name}.${this.getByCampaign.name}: Failed to get subscribers for campaign`);
            throw error;
        }
    }

    /**
     * Partially updates a subscriber. `group_ids`, when present, replaces the
     * subscriber's memberships in the same transaction.
     *
     * @param subscriberId - id of the subscriber to update.
     * @param data - Fields to update.
     * @returns The updated subscriber with its `group_ids`, or `null` if no match exists.
     * @throws {ValidationError} If a group id doesn't exist.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async update(subscriberId: string, data: UpdateSubscriberInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);
        logger.debug({ subscriberId, data }, `Request:`);

        try {
            const { group_ids, ...fields } = data;
            const subscriber = await db.transaction(async (tx) => {
                // Drizzle refuses an empty `set`, so a groups-only update just checks the row exists.
                const [row] = Object.keys(fields).length > 0
                    ? await tx.update(subscribersTable).set(fields).where(eq(subscribersTable.id, subscriberId)).returning({ id: subscribersTable.id })
                    : await tx.select({ id: subscribersTable.id }).from(subscribersTable).where(eq(subscribersTable.id, subscriberId));
                if (!row) return null;

                if (group_ids !== undefined) await this.setGroups(tx, subscriberId, group_ids);
                return this.readWithGroups(tx, subscriberId);
            });

            if (!subscriber) {
                logger.warn({ subscriberId }, `${this.constructor.name}.${this.update.name}: Subscriber not found`);
                return null;
            }

            logger.debug({ subscriberId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

            return subscriber;
        } catch (error) {
            logger.error({ err: error, subscriberId, data }, `Exception in ${this.constructor.name}.${this.update.name}: Failed to update subscriber`);
            throw error;
        }
    }

    /**
     * Adds an existing subscriber to a group. Adding someone already in the
     * group is a no-op, not an error.
     *
     * @param groupId - id of the group.
     * @param subscriberId - id of the subscriber.
     * @returns The subscriber with its updated `group_ids`, or `null` if the group or subscriber doesn't exist.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async addToGroup(groupId: string, subscriberId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.addToGroup.name}`);
        logger.debug({ groupId, subscriberId }, `Request:`);

        try {
            const subscriber = await db.transaction(async (tx) => {
                const [group] = await tx.select({ id: groupTable.id }).from(groupTable).where(eq(groupTable.id, groupId));
                const existing = await this.readWithGroups(tx, subscriberId);
                if (!group || !existing) return null;

                await tx.insert(groupSubscriberTable).values({ group_id: groupId, subscriber_id: subscriberId }).onConflictDoNothing();
                return this.readWithGroups(tx, subscriberId);
            });

            if (!subscriber) {
                logger.warn({ groupId, subscriberId }, `${this.constructor.name}.${this.addToGroup.name}: Group or subscriber not found`);
                return null;
            }

            logger.debug({ groupId, subscriberId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.addToGroup.name}`);

            return subscriber;
        } catch (error) {
            logger.error({ err: error, groupId, subscriberId }, `Exception in ${this.constructor.name}.${this.addToGroup.name}: Failed to add subscriber to group`);
            throw error;
        }
    }

    /**
     * Removes a subscriber from a group. The subscriber itself is kept.
     *
     * @param groupId - id of the group.
     * @param subscriberId - id of the subscriber.
     * @returns The subscriber with its updated `group_ids`, or `null` if they weren't in the group.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async removeFromGroup(groupId: string, subscriberId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.removeFromGroup.name}`);
        logger.debug({ groupId, subscriberId }, `Request:`);

        try {
            const subscriber = await db.transaction(async (tx) => {
                const [removed] = await tx.delete(groupSubscriberTable)
                    .where(and(eq(groupSubscriberTable.group_id, groupId), eq(groupSubscriberTable.subscriber_id, subscriberId)))
                    .returning({ id: groupSubscriberTable.id });
                if (!removed) return null;
                return this.readWithGroups(tx, subscriberId);
            });

            if (!subscriber) {
                logger.warn({ groupId, subscriberId }, `${this.constructor.name}.${this.removeFromGroup.name}: Subscriber not in group`);
                return null;
            }

            logger.debug({ groupId, subscriberId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.removeFromGroup.name}`);

            return subscriber;
        } catch (error) {
            logger.error({ err: error, groupId, subscriberId }, `Exception in ${this.constructor.name}.${this.removeFromGroup.name}: Failed to remove subscriber from group`);
            throw error;
        }
    }

    /**
     * Removes many subscribers from one group at once. The subscribers
     * themselves are kept, and ids that weren't members are ignored.
     *
     * @param groupId - id of the group.
     * @param subscriberIds - ids of the subscribers to take out of it.
     * @returns The ids actually removed (empty when none were members).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async removeManyFromGroup(groupId: string, subscriberIds: string[]): Promise<BulkRemoveResult> {
        logger.info(`Start method: ${this.constructor.name}.${this.removeManyFromGroup.name}`);
        logger.debug({ groupId, count: subscriberIds.length }, `Request:`);

        try {
            // One statement: deleting only this group's rows for these subscribers.
            const removed = await db.delete(groupSubscriberTable)
                .where(and(eq(groupSubscriberTable.group_id, groupId), inArray(groupSubscriberTable.subscriber_id, [...new Set(subscriberIds)])))
                .returning({ subscriber_id: groupSubscriberTable.subscriber_id });

            const result: BulkRemoveResult = { removed_ids: removed.map((row) => row.subscriber_id) };

            logger.debug({ groupId, removed: result.removed_ids.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.removeManyFromGroup.name}`);

            return result;
        } catch (error) {
            logger.error({ err: error, groupId, count: subscriberIds.length }, `Exception in ${this.constructor.name}.${this.removeManyFromGroup.name}: Failed to remove subscribers from group`);
            throw error;
        }
    }

    /**
     * Deletes many subscribers at once; their group and campaign memberships
     * go with them (cascade). A subscriber a campaign has already been sent
     * to is kept and reported in `blocked_ids`: their `campaign_delivery`
     * rows are the campaign's send history and reference them. Ids that
     * don't exist are ignored. Runs in one transaction.
     *
     * @param subscriberIds - ids of the subscribers to delete.
     * @returns The ids deleted and the ids kept for their send history.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async deleteMany(subscriberIds: string[]): Promise<BulkDeleteResult> {
        logger.info(`Start method: ${this.constructor.name}.${this.deleteMany.name}`);
        logger.debug({ count: subscriberIds.length }, `Request:`);

        try {
            const unique = [...new Set(subscriberIds)];

            const result = await db.transaction(async (tx) => {
                // Who has send history: deleting them would break their deliveries' foreign key.
                const sentTo = await tx.select({ id: campaignDeliveryTable.subscriber_id }).from(campaignDeliveryTable)
                    .where(inArray(campaignDeliveryTable.subscriber_id, unique));
                const blocked = new Set(sentTo.map((row) => row.id));
                const deletable = unique.filter((id) => !blocked.has(id));

                // Drizzle can't render an empty `in ()`, so skip the delete when nothing qualifies.
                const deleted = deletable.length > 0
                    ? await tx.delete(subscribersTable).where(inArray(subscribersTable.id, deletable)).returning({ id: subscribersTable.id })
                    : [];

                // Report only ids that exist: a blocked id has deliveries, so it's a real subscriber.
                return { deleted_ids: deleted.map((row) => row.id), blocked_ids: unique.filter((id) => blocked.has(id)) };
            });

            logger.debug({ deleted: result.deleted_ids.length, blocked: result.blocked_ids.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.deleteMany.name}`);

            return result;
        } catch (error) {
            logger.error({ err: error, count: subscriberIds.length }, `Exception in ${this.constructor.name}.${this.deleteMany.name}: Failed to delete subscribers`);
            throw error;
        }
    }

    /**
     * Deletes a subscriber. Its group memberships go with it (cascade).
     *
     * @param subscriberId - id of the subscriber to delete.
     * @returns The deleted subscriber row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async delete(subscriberId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);
        logger.debug({ subscriberId }, `Request:`);

        try {
            const [subscriber] = await db.delete(subscribersTable).where(eq(subscribersTable.id, subscriberId)).returning();

            if (!subscriber) {
                logger.warn({ subscriberId }, `${this.constructor.name}.${this.delete.name}: Subscriber not found`);
                return null;
            }

            logger.debug({ subscriberId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

            return subscriber;
        } catch (error) {
            logger.error({ err: error, subscriberId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete subscriber`);
            throw error;
        }
    }
}

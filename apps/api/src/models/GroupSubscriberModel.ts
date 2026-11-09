import { pgTable, varchar, timestamp, index, unique } from "drizzle-orm/pg-core";
import { groupTable } from "./GroupModel";
import { subscribersTable } from "./SubscriberModel";

/**
 * Drizzle schema for `group_subscriber`: which subscribers are in which
 * groups. Many-to-many - a subscriber can be in any number of groups and a
 * group holds any number of subscribers. Rows are meaningless without either
 * side, so deleting a group or a subscriber removes its memberships.
 */
export const groupSubscriberTable = pgTable("group_subscriber", {
    /** UUID to uniquely identify the membership. */
    id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Denotes the type of object and the domain it belongs to. */
    entity: varchar("entity").default("mail_rocket.group_subscriber"),
    /** ID of the group. */
    group_id: varchar("group_id").notNull().references(() => groupTable.id, { onDelete: "cascade" }),
    /** ID of the subscriber in the group. */
    subscriber_id: varchar("subscriber_id").notNull().references(() => subscribersTable.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
}, (table) => [
    // One membership per pair; also indexes `group_id` for listing a group's members.
    unique("group_subscriber_group_id_subscriber_id_unique").on(table.group_id, table.subscriber_id),
    // Backs looking up a subscriber's groups.
    index("group_subscriber_subscriber_id_idx").on(table.subscriber_id),
]);

/** TS type for a group_subscriber row, inferred directly from the table schema above. */
export type IGroupSubscriber = typeof groupSubscriberTable.$inferSelect;

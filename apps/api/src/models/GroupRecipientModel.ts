import { pgTable, varchar, timestamp, index, unique } from "drizzle-orm/pg-core";
import { groupTable } from "./GroupModel";
import { recipientsTable } from "./RecipientModel";

/**
 * Drizzle schema for `group_recipient`: which recipients are in which
 * groups. Many-to-many - a recipient can be in any number of groups and a
 * group holds any number of recipients. Rows are meaningless without either
 * side, so deleting a group or a recipient removes its memberships.
 */
export const groupRecipientTable = pgTable("group_recipient", {
    /** UUID to uniquely identify the membership. */
    id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Denotes the type of object and the domain it belongs to. */
    entity: varchar("entity").default("mail_rocket.group_recipient"),
    /** ID of the group. */
    group_id: varchar("group_id").notNull().references(() => groupTable.id, { onDelete: "cascade" }),
    /** ID of the recipient in the group. */
    recipient_id: varchar("recipient_id").notNull().references(() => recipientsTable.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
}, (table) => [
    // One membership per pair; also indexes `group_id` for listing a group's members.
    unique("group_recipient_group_id_recipient_id_unique").on(table.group_id, table.recipient_id),
    // Backs looking up a recipient's groups.
    index("group_recipient_recipient_id_idx").on(table.recipient_id),
]);

/** TS type for a group_recipient row, inferred directly from the table schema above. */
export type IGroupRecipient = typeof groupRecipientTable.$inferSelect;

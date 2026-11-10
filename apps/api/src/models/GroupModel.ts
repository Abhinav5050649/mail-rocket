import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

/**
 * Drizzle schema for `group`: a reusable subscriber list. Members are linked
 * through `group_subscriber`; any number of campaigns can send to the same
 * group through `campaign_group`.
 */
export const groupTable = pgTable("group", {
    /** UUID to uniquely identify group. */
    id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
    /** Denotes the type of object and the domain it belongs to. */
    entity: varchar("entity").default("mail_rocket.group"),
    /** Name of group. */
    name: varchar("name"),
    /** Normalized name of group. */
    normalized_name: varchar("normalized_name"),
});

/** TS type for a group row, inferred directly from the table schema above. */
export type IGroup = typeof groupTable.$inferSelect;

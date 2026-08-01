import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

/**
 * Drizzle schema for `user`. A user's identity is organization-independent
 * - which organizations they belong to, and what role they hold in each,
 * lives on the `organization_user` join table instead, so the same person
 * can be a member of multiple organizations.
 */
export const userTable = pgTable("user", {
    /** UUID to identify user. */
    id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Denotes domain the record belongs to. */
    entity: varchar("entity").default("mail_rocket.user"),
    /** First name of user. */
    first_name: varchar("first_name"),
    /** Last name of user. */
    last_name: varchar("last_name"),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
    /** Normalized name of user. */
    normalized_name: varchar("normalized_name"),
});

/** TS type for a user row, inferred directly from the table schema above. */
export type IUser = typeof userTable.$inferSelect;

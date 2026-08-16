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
    /** Login identity - unique across every user, used by signup/signin. */
    email: varchar("email").notNull().unique(),
    /**
     * Bcrypt hash of the user's password. Null means the account was
     * created without credentials (e.g. an org admin inviting a member by
     * email) and hasn't been activated yet - signin must reject these, and
     * signup is allowed to attach credentials to them.
     */
    password_hash: varchar("password_hash"),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
    /** Normalized name of user. */
    normalized_name: varchar("normalized_name"),
});

/** TS type for a user row, inferred directly from the table schema above. */
export type IUser = typeof userTable.$inferSelect;

import { pgTable, pgEnum, varchar, timestamp } from "drizzle-orm/pg-core";
import { organizationTable } from "./OrganizationModel";

/** Permission level of a user within their organization. */
export const userRoleEnum = pgEnum("user_role", ["viewer", "editor", "admin"]);

/** TS union type for a user's `role` column. */
export type UserRole = (typeof userRoleEnum.enumValues)[number];

/**
 * Drizzle schema for `user`: a member of an organization.
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
    /** ID of the organization the user belongs to. */
    organization_id: varchar("organization_id").references(() => organizationTable.id),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
    /** Normalized name of user. */
    normalized_name: varchar("normalized_name"),
    /** Permission level of the user within their organization. */
    role: userRoleEnum("role").default("viewer"),
});

/** TS type for a user row, inferred directly from the table schema above. */
export type IUser = typeof userTable.$inferSelect;

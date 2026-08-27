import { pgTable, pgEnum, varchar, timestamp, unique, index } from "drizzle-orm/pg-core";
import { organizationTable } from "./OrganizationModel";
import { userTable } from "./UserModel";

/**
 * Permission level a user holds within one specific organization. Lives on
 * the membership (this table), not on `user`, since the same person can be
 * a `viewer` in one organization and an `admin` in another.
 */
export const organizationUserRoleEnum = pgEnum("organization_user_role", ["viewer", "editor", "admin"]);

/** TS union type for a membership's `role` column. */
export type OrganizationUserRole = (typeof organizationUserRoleEnum.enumValues)[number];

/**
 * Drizzle schema for `organization_user`: the join table granting a user
 * membership in an organization. A user can belong to multiple
 * organizations (and an organization has multiple users) via one row per
 * (organization, user) pair here, which is what makes the relationship
 * many-to-many instead of the one-org-per-user FK `user` used to have.
 */
export const organizationUserTable = pgTable("organization_user", {
    /** UUID to uniquely identify the membership row itself. */
    id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Denotes the type of object and the domain it belongs to. */
    entity: varchar("entity").default("mail_rocket.organization_user"),
    /** ID of the organization the user is a member of. */
    organization_id: varchar("organization_id").references(() => organizationTable.id, { onDelete: "cascade" }).notNull(),
    /** ID of the user who is a member. */
    user_id: varchar("user_id").references(() => userTable.id, { onDelete: "cascade" }).notNull(),
    /** Permission level the user holds within this specific organization. */
    role: organizationUserRoleEnum("role").default("viewer"),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about the membership. */
    description: varchar("description"),
}, (table) => [
    // A user can only have one membership (and therefore one role) per organization.
    // Also backs `getByOrganization`/`getUsersByOrganization`, which filter on
    // organization_id alone - Postgres can use this composite index's leading
    // column for that, so no separate organization_id-only index is needed.
    unique("organization_user_organization_id_user_id_unique").on(table.organization_id, table.user_id),
    // Backs `getByUser`/`getOrganizationsByUser`, which filter on user_id
    // alone; the composite unique index above can't serve that (user_id
    // isn't its leading column).
    index("organization_user_user_id_idx").on(table.user_id),
]);

/** TS type for a membership row, inferred directly from the table schema above. */
export type IOrganizationUser = typeof organizationUserTable.$inferSelect;

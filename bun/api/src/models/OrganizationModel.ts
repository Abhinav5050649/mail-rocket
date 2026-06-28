import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

/**
 * Drizzle schema for `organization`: a tenant in Mail Rocket. Every other
 * table scopes its rows to one organization.
 *
 * `id`, `created_at`, and `updated_at` have no DB-side default - the
 * migration SQL doesn't define one, so Drizzle generates them client-side
 * via `$defaultFn`/`$onUpdate` instead of a Postgres `DEFAULT` clause, to
 * stay faithful to the hand-written SQL.
 */
export const organizationTable = pgTable("organization", {
    /** UUID to uniquely identify organization. */
    id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Denotes the type of object and the domain it belongs to. */
    entity: varchar("entity").default("mail_rocket.organization"),
    /** Name of organization. */
    name: varchar("name"),
    /** Normalized Name of Organization. */
    normalized_name: varchar("normalized_name"),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** To store extra information about record. */
    description: varchar("description"),
});

/** TS type for an organization row, inferred directly from the table schema above. */
export type IOrganization = typeof organizationTable.$inferSelect;

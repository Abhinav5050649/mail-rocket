import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

/**
 * Drizzle schema for `organization`: the profile of the organization that
 * runs this self-hosted instance. There is exactly one row - seeded at boot
 * by `bootstrap()` and only ever updated afterwards - so it is not a tenant
 * boundary: nothing else is scoped by it. `address` and `contact_details`
 * reference it as the organization's own postal/contact details, and
 * campaigns read its `name` for the `{{organization_name}}` variable and its
 * `timezone` for dates.
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
    /**
     * IANA time zone the organization works in (e.g. "Europe/London"). The
     * app shows every date in it, start times are entered in it, and
     * `{{campaign_start_date}}` is rendered in it. Timestamps themselves stay
     * absolute instants, so changing it never moves a scheduled send.
     */
    timezone: varchar("timezone").notNull().default("UTC"),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** To store extra information about record. */
    description: varchar("description"),
});

/** TS type for an organization row, inferred directly from the table schema above. */
export type IOrganization = typeof organizationTable.$inferSelect;

import { pgTable, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { organizationTable } from "./OrganizationModel";

/** Drizzle schema for `contact_details`: email/phone the organization can be reached at. */
export const contactDetailsTable = pgTable("contact_details", {
    /** UUID to uniquely identify contact. */
    id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Denotes the type of record and the domain which it belongs to. */
    entity: varchar("entity").default("mail_rocket.contact_details"),
    /** Email ID. */
    email_id: varchar("email_id"),
    /** Country Code. */
    country_code: varchar("country_code"),
    /** Phone number. */
    phone_number: varchar("phone_number"),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** To store additional metadata about contact. */
    description: varchar("description"),
    /** Organization the contact detail is associated to. */
    organization_id: varchar("organization_id").references(() => organizationTable.id),
}, (table) => [
    // Backs `getByOrganization`.
    index("contact_details_organization_id_idx").on(table.organization_id),
]);

/** TS type for a contact_details row, inferred directly from the table schema above. */
export type IContactDetails = typeof contactDetailsTable.$inferSelect;

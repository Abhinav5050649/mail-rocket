import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";
import { organizationTable } from "./OrganizationModel";
import { userTable } from "./UserModel";

/** Drizzle schema for `contact_details`: email/phone reachable via a user or organization. */
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
    /** User the contact detail is associated to. */
    user_id: varchar("user_id").references(() => userTable.id),
});

/** TS type for a contact_details row, inferred directly from the table schema above. */
export type IContactDetails = typeof contactDetailsTable.$inferSelect;

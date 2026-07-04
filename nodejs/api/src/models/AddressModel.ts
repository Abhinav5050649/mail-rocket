import { pgTable, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { organizationTable } from "./OrganizationModel";
import { userTable } from "./UserModel";

/**
 * Drizzle schema for `address`. `id` is `varchar` like every other table
 * here - the original migration had it as `bigint`, which was a mistake
 * (the migration SQL has been corrected to match).
 */
export const addressTable = pgTable("address", {
    /** UUID to uniquely identify address. */
    id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Denotes the type of object and the domain it belongs to. */
    entity: varchar("entity").default("mail_rocket.address"),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
    /** Street where organization is located. */
    street: varchar("street"),
    /** Area where organization is located. */
    area: varchar("area"),
    /** City where organization is located. */
    city: varchar("city"),
    /** State where organization is located. */
    state: varchar("state"),
    /** Country where organization is located. */
    country: varchar("country"),
    /** Postal Code of Area where organization is located. */
    postal_code: varchar("postal_code"),
    /** Denotes whether this record is the primary address of the organization or not. */
    is_primary: boolean("is_primary").default(true),
    /** ID of organization. */
    organization_id: varchar("organization_id").references(() => organizationTable.id),
    /** ID of user. */
    user_id: varchar("user_id").references(() => userTable.id),
});

/** TS type for an address row, inferred directly from the table schema above. */
export type IAddress = typeof addressTable.$inferSelect;

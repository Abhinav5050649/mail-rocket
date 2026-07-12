import { pgTable, pgEnum, varchar, timestamp } from "drizzle-orm/pg-core";
import { organizationTable } from "./OrganizationModel";

/** Kind of sending identity: a whole domain or a single email address. */
export const identityTypeEnum = pgEnum("identity_type", ["domain", "email"]);

/** TS union type for an identity's `type` column. */
export type IdentityType = (typeof identityTypeEnum.enumValues)[number];

/** Lifecycle status of an identity. */
export const identityStatusEnum = pgEnum("identity_status", ["created", "active"]);

/** TS union type for an identity's `status` column. */
export type IdentityStatus = (typeof identityStatusEnum.enumValues)[number];

/** Drizzle schema for `identity`: a domain or email address an organization sends from. */
export const identityTable = pgTable("identity", {
    /** UUID to uniquely identify identity. */
    id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Denotes the type of object and the domain it belongs to. */
    entity: varchar("entity").default("mail_rocket.identity"),
    /** Whether this identity is a domain or an email address. */
    type: identityTypeEnum("type").notNull(),
    /** The domain name or email address being identified. */
    identity: varchar("identity").notNull(),
    /** ID of organization the identity belongs to. */
    organization_id: varchar("organization_id").references(() => organizationTable.id),
    /** Lifecycle status of the identity. */
    status: identityStatusEnum("status").default("created"),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
});

/** TS type for an identity row, inferred directly from the table schema above. */
export type IIdentity = typeof identityTable.$inferSelect;

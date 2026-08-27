import { pgTable, pgEnum, varchar, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { organizationTable } from "./OrganizationModel";

/** Kind of sending identity: a whole domain or a single email address. */
export const identityTypeEnum = pgEnum("identity_type", ["domain", "email"]);

/** TS union type for an identity's `type` column. */
export type IdentityType = (typeof identityTypeEnum.enumValues)[number];

/** Lifecycle status of an identity. `pending` = SES verification in flight. */
export const identityStatusEnum = pgEnum("identity_status", ["created", "pending", "active"]);

/** TS union type for an identity's `status` column. */
export type IdentityStatus = (typeof identityStatusEnum.enumValues)[number];

/** One DNS record the caller must add so SES can confirm a domain identity. */
export interface IdentityVerificationRecord {
    type: "TXT" | "CNAME";
    name: string;
    value: string;
}

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
    status: identityStatusEnum("status").default("pending"),
    /** DNS records (TXT + DKIM CNAMEs) SES returned for a domain identity; null for email identities. */
    verification_records: jsonb("verification_records").$type<IdentityVerificationRecord[]>(),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
}, (table) => [
    // Backs `getByOrganization`, which filters on organization_id.
    index("identity_organization_id_idx").on(table.organization_id),
]);

/** TS type for an identity row, inferred directly from the table schema above. */
export type IIdentity = typeof identityTable.$inferSelect;

import type { Claim, KeyPreset } from "./abilities";

/**
 * The API's response shapes as they arrive over the wire (JSON): timestamps
 * are ISO strings, not `Date`s. The API checks its own services against
 * these at compile time (`apps/api/src/libs/contracts.ts`), so a field added
 * or dropped on one side fails the build instead of drifting silently.
 *
 * The status enums are `as const` arrays so the API's Postgres enums are
 * built from the same values.
 */

/** Kinds of sending identity. */
export const IDENTITY_TYPES = ["domain", "email"] as const;
export type IdentityType = (typeof IDENTITY_TYPES)[number];

/** Identity lifecycle: `pending` = SES verification in flight. */
export const IDENTITY_STATUSES = ["created", "pending", "active"] as const;
export type IdentityStatus = (typeof IDENTITY_STATUSES)[number];

/** Campaign lifecycle: draft -> scheduled -> sending -> sent | failed. */
export const CAMPAIGN_STATUSES = ["draft", "scheduled", "sending", "sent", "failed"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/** One recipient's outcome within one send. */
export const SEND_STATUSES = ["pending", "sent", "failed"] as const;
export type SendStatus = (typeof SEND_STATUSES)[number];

/** Columns every table carries. */
interface BaseFields {
    id: string;
    entity: string;
    description: string | null;
    created_at: string;
    updated_at: string | null;
}

/** The instance's single organization profile (GET/PATCH /organization). */
export interface Organization extends BaseFields {
    name: string | null;
    normalized_name: string | null;
    /** IANA time zone every date is shown and every start time entered in. */
    timezone: string;
}

/**
 * An API key - the only principal (GET /me, /keys). The secret is never
 * returned except once, on creation (`ApiKeyCreated`).
 */
export interface ApiKey {
    id: string;
    name: string;
    claims: Claim[];
    /** The preset the claims exactly match, or null for a custom claim list. */
    preset: KeyPreset | null;
    prefix: string;
    expires_at: string | null;
    description: string | null;
    created_at: string;
    updated_at: string | null;
}

/** What GET /keys returns per key to a caller without the `create Key` claim. */
export type ApiKeySummary = Pick<ApiKey, "id" | "name" | "claims" | "preset">;

/** POST /keys response: the key plus its plaintext secret, shown exactly once. */
export type ApiKeyCreated = ApiKey & { secret: string };

export interface Address extends BaseFields {
    street: string | null;
    area: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postal_code: string | null;
    is_primary: boolean;
    /** Always the instance's single organization. */
    organization_id: string;
}

export interface ContactDetails extends BaseFields {
    email_id: string | null;
    country_code: string | null;
    phone_number: string | null;
    /** Always the instance's single organization. */
    organization_id: string;
}

/** One DNS record to add so SES can confirm a domain identity. */
export interface IdentityVerificationRecord {
    type: "TXT" | "CNAME";
    name: string;
    value: string;
}

export interface Identity extends BaseFields {
    type: IdentityType;
    identity: string;
    status: IdentityStatus;
    verification_records: IdentityVerificationRecord[] | null;
}

export interface Campaign extends BaseFields {
    name: string | null;
    subject: string | null;
    logo_key: string | null;
    logo_bucket: string | null;
    start_time: string | null;
    normalized_name: string | null;
    status: CampaignStatus;
    identity_id: string | null;
    failure_reason: string | null;
}

export interface Template extends BaseFields {
    name: string | null;
    html_body: string | null;
    campaign_id: string | null;
    normalized_name: string | null;
}

export interface Group extends BaseFields {
    name: string | null;
    campaign_id: string | null;
    normalized_name: string | null;
}

export interface Recipient extends BaseFields {
    first_name: string | null;
    last_name: string | null;
    normalized_name: string | null;
    email_id: string | null;
    /** Every group the recipient is in (many-to-many, via `group_recipient`). */
    group_ids: string[];
    campaign_id: string | null;
}

/** Per-recipient delivery outcomes of one send, or of every send together. */
export type DeliveryCounts = Record<SendStatus, number>;

/** A campaign whose send has started, with how its deliveries went. */
export type RecentCampaign = Campaign & { deliveries: DeliveryCounts };

/** GET /overview. Each section is null when the key can't `read` its subject. */
export interface Overview {
    campaigns: {
        total: number;
        by_status: Record<CampaignStatus, number>;
        /** Next scheduled sends, soonest first (max 5). */
        upcoming: Campaign[];
        /** Latest sends, newest first (max 5). */
        recent: RecentCampaign[];
        deliveries: DeliveryCounts;
    } | null;
    identities: { total: number; by_status: Record<IdentityStatus, number> } | null;
    templates: { total: number } | null;
    groups: { total: number } | null;
    recipients: { total: number } | null;
    keys: { total: number } | null;
}

/** Standard limit/offset pagination args every list endpoint accepts. */
export interface PageArgs {
    limit?: number;
    offset?: number;
}

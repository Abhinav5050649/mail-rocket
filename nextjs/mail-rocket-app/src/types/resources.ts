import type { Claim, KeyPreset } from "@/lib/auth/abilities";

/**
 * TS shapes mirrored from bun/api's Drizzle models (bun/api/src/models/*.ts).
 * Timestamps arrive over the wire as ISO strings, not `Date` instances.
 */

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

export type IdentityType = "domain" | "email";
export type IdentityStatus = "created" | "pending" | "active";

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

/** Lifecycle: draft -> scheduled -> sending -> sent | failed (see CampaignModel.ts). */
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";

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
  group_id: string | null;
  campaign_id: string | null;
}

/** Standard limit/offset pagination args every list endpoint accepts. */
export interface PageArgs {
  limit?: number;
  offset?: number;
}

export const DEFAULT_PAGE_SIZE = 25;

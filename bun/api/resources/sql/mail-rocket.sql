-- =============================================================================
-- Mail Rocket - PostgreSQL schema
-- =============================================================================
-- The full schema of a fresh database, mirroring the Drizzle table definitions
-- in `src/models/*.ts` (and `drizzle/0000_cold_thunderbolt.sql`). Reference
-- only: the app applies its schema through Drizzle migrations
-- (`bun run db:migrate`), so change the models and regenerate rather than
-- editing this file first - then update this file to match.
--
-- Self-hosted and single-organization: there are no tenants and no users.
-- `organization` is one seeded row (the instance's profile), referenced only
-- by `address` and `contact_details`. `api_key` is the only principal; its
-- `claims` decide what it may do.
--
-- Tables are created in dependency order, so the file can be run top to
-- bottom against an empty database.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

-- Whether an identity is a whole domain or a single email address.
CREATE TYPE "public"."identity_type" AS ENUM ('domain', 'email');

-- SES verification state of an identity. `created` is unused - identities are
-- inserted as `pending` and become `active` once SES confirms ownership.
CREATE TYPE "public"."identity_status" AS ENUM ('created', 'pending', 'active');

-- Lifecycle of a campaign's send; driven by `start_time` and the send pipeline.
CREATE TYPE "public"."campaign_status" AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed');

-- Outcome of sending one campaign to one recipient.
CREATE TYPE "public"."campaign_recipient_send_status" AS ENUM ('pending', 'sent', 'failed');


-- -----------------------------------------------------------------------------
-- organization - the instance's profile. Exactly one row, seeded at boot;
-- read/updated via `/organization`, never created or deleted over the API.
-- -----------------------------------------------------------------------------
CREATE TABLE "organization" (
    "id"              varchar PRIMARY KEY NOT NULL,                  -- UUID
    "entity"          varchar DEFAULT 'mail_rocket.organization',    -- Object type and domain it belongs to
    "name"            varchar,
    "normalized_name" varchar,                                       -- Lowercased name, for case-insensitive lookups
    "created_at"      timestamp,
    "updated_at"      timestamp,
    "description"     varchar                                        -- Extra information about the record
);


-- -----------------------------------------------------------------------------
-- api_key - the only principal. Authentication is one indexed lookup on
-- `key_hash`; revoking is a real delete. Nothing references this table.
-- -----------------------------------------------------------------------------
CREATE TABLE "api_key" (
    "id"          varchar PRIMARY KEY NOT NULL,                      -- UUID
    "entity"      varchar DEFAULT 'mail_rocket.api_key',
    "name"        varchar NOT NULL,                                  -- Display label; not unique
    "claims"      jsonb NOT NULL,                                    -- CASL [{ action, subject }] grants
    "key_hash"    varchar NOT NULL,                                  -- SHA-256 hex of the secret; the secret is never stored
    "prefix"      varchar NOT NULL,                                  -- First characters of the secret, for recognising a key
    "expires_at"  timestamp,                                         -- Null = never expires
    "created_at"  timestamp,
    "updated_at"  timestamp,
    "description" varchar,
    CONSTRAINT "api_key_key_hash_unique" UNIQUE ("key_hash")
);


-- -----------------------------------------------------------------------------
-- identity - a domain or email address campaigns send from (an SES identity).
-- -----------------------------------------------------------------------------
CREATE TABLE "identity" (
    "id"                   varchar PRIMARY KEY NOT NULL,             -- UUID
    "entity"               varchar DEFAULT 'mail_rocket.identity',
    "type"                 "identity_type" NOT NULL,                 -- Fixed after creation
    "identity"             varchar NOT NULL,                         -- Domain name or email address; fixed after creation
    "status"               "identity_status" DEFAULT 'pending',      -- System-managed: set by SES verification
    "verification_records" jsonb,                                    -- System-managed: DNS records for a domain; null for email
    "created_at"           timestamp,
    "updated_at"           timestamp,
    "description"          varchar
);


-- -----------------------------------------------------------------------------
-- address - postal address of the organization.
-- -----------------------------------------------------------------------------
CREATE TABLE "address" (
    "id"              varchar PRIMARY KEY NOT NULL,                  -- UUID
    "entity"          varchar DEFAULT 'mail_rocket.address',
    "created_at"      timestamp,
    "updated_at"      timestamp,
    "description"     varchar,
    "street"          varchar,
    "area"            varchar,
    "city"            varchar,
    "state"           varchar,
    "country"         varchar,
    "postal_code"     varchar,
    "is_primary"      boolean DEFAULT true,                          -- Whether this is the organization's primary address
    "organization_id" varchar,                                       -- Always the single organization row
    CONSTRAINT "address_organization_id_organization_id_fk"
        FOREIGN KEY ("organization_id") REFERENCES "public"."organization" ("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX "address_organization_id_idx" ON "address" USING btree ("organization_id");


-- -----------------------------------------------------------------------------
-- contact_details - email/phone the organization can be reached at.
-- -----------------------------------------------------------------------------
CREATE TABLE "contact_details" (
    "id"              varchar PRIMARY KEY NOT NULL,                  -- UUID
    "entity"          varchar DEFAULT 'mail_rocket.contact_details',
    "email_id"        varchar,
    "country_code"    varchar,
    "phone_number"    varchar,
    "created_at"      timestamp,
    "updated_at"      timestamp,
    "description"     varchar,
    "organization_id" varchar,                                       -- Always the single organization row
    CONSTRAINT "contact_details_organization_id_organization_id_fk"
        FOREIGN KEY ("organization_id") REFERENCES "public"."organization" ("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX "contact_details_organization_id_idx" ON "contact_details" USING btree ("organization_id");


-- -----------------------------------------------------------------------------
-- campaign - an email campaign.
-- -----------------------------------------------------------------------------
CREATE TABLE "campaign" (
    "id"              varchar PRIMARY KEY NOT NULL,                  -- UUID
    "entity"          varchar DEFAULT 'mail_rocket.campaign',
    "name"            varchar,
    "subject"         varchar,                                       -- Subject line of the campaign email
    "logo_key"        varchar,                                       -- Storage key/path of the campaign logo
    "logo_bucket"     varchar,                                       -- Storage bucket holding the logo
    "created_at"      timestamp,
    "updated_at"      timestamp,
    "description"     varchar,
    "start_time"      timestamp,                                     -- Setting it schedules the send; null cancels it
    "normalized_name" varchar,
    "status"          "campaign_status" DEFAULT 'draft',             -- System-managed: driven by start_time and the send pipeline
    "identity_id"     varchar,                                       -- Sending identity (SES From address)
    "failure_reason"  varchar,                                       -- System-managed: why the send ended in `failed`
    CONSTRAINT "campaign_identity_id_identity_id_fk"
        FOREIGN KEY ("identity_id") REFERENCES "public"."identity" ("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION
);


-- -----------------------------------------------------------------------------
-- template - HTML body for a campaign email. A campaign can hold several
-- (draft revisions, A/B variants); subject/name live on `campaign`.
-- -----------------------------------------------------------------------------
CREATE TABLE "template" (
    "id"              varchar PRIMARY KEY NOT NULL,                  -- UUID
    "entity"          varchar DEFAULT 'mail_rocket.template',
    "name"            varchar,
    "html_body"       varchar,                                       -- HTML markup of the email body
    "campaign_id"     varchar,
    "normalized_name" varchar,
    "created_at"      timestamp,
    "updated_at"      timestamp,
    "description"     varchar,
    CONSTRAINT "template_campaign_id_campaign_id_fk"
        FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign" ("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX "template_campaign_id_idx" ON "template" USING btree ("campaign_id");


-- -----------------------------------------------------------------------------
-- group - a recipient list within a campaign. (Quoted: GROUP is a keyword.)
-- -----------------------------------------------------------------------------
CREATE TABLE "group" (
    "id"              varchar PRIMARY KEY NOT NULL,                  -- UUID
    "created_at"      timestamp,
    "updated_at"      timestamp,
    "description"     varchar,
    "entity"          varchar DEFAULT 'mail_rocket.group',
    "name"            varchar,
    "campaign_id"     varchar,
    "normalized_name" varchar,
    CONSTRAINT "group_campaign_id_campaign_id_fk"
        FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign" ("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX "group_campaign_id_idx" ON "group" USING btree ("campaign_id");


-- -----------------------------------------------------------------------------
-- recipients - a person targeted by a campaign/group.
-- -----------------------------------------------------------------------------
CREATE TABLE "recipients" (
    "id"              varchar PRIMARY KEY NOT NULL,                  -- UUID
    "entity"          varchar DEFAULT 'mail_rocket.recipients',
    "first_name"      varchar,
    "last_name"       varchar,
    "normalized_name" varchar,
    "email_id"        varchar,
    "group_id"        varchar,
    "campaign_id"     varchar,
    "created_at"      timestamp,
    "updated_at"      timestamp,
    "description"     varchar,
    CONSTRAINT "recipients_group_id_group_id_fk"
        FOREIGN KEY ("group_id") REFERENCES "public"."group" ("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "recipients_campaign_id_campaign_id_fk"
        FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign" ("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX "recipients_group_id_idx" ON "recipients" USING btree ("group_id");
CREATE INDEX "recipients_campaign_id_idx" ON "recipients" USING btree ("campaign_id");


-- -----------------------------------------------------------------------------
-- campaign_recipient - one recipient's send outcome within one campaign's
-- send. Created by the dispatch job (one row per recipient, per send), kept
-- apart from `recipients` so a recipient stays reusable across campaigns.
-- -----------------------------------------------------------------------------
CREATE TABLE "campaign_recipient" (
    "id"           varchar PRIMARY KEY NOT NULL,                     -- UUID
    "entity"       varchar DEFAULT 'mail_rocket.campaign_recipient',
    "campaign_id"  varchar,
    "recipient_id" varchar,
    "send_status"  "campaign_recipient_send_status" DEFAULT 'pending',
    "sent_at"      timestamp,
    "created_at"   timestamp,
    "updated_at"   timestamp,
    "description"  varchar,                                          -- Failure detail when send_status is `failed`
    CONSTRAINT "campaign_recipient_campaign_id_campaign_id_fk"
        FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign" ("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "campaign_recipient_recipient_id_recipients_id_fk"
        FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients" ("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX "campaign_recipient_campaign_id_idx" ON "campaign_recipient" USING btree ("campaign_id");
CREATE INDEX "campaign_recipient_recipient_id_idx" ON "campaign_recipient" USING btree ("recipient_id");
CREATE INDEX "campaign_recipient_campaign_id_send_status_idx" ON "campaign_recipient" USING btree ("campaign_id", "send_status");

CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'sending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."campaign_recipient_send_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."identity_status" AS ENUM('created', 'pending', 'active');--> statement-breakpoint
CREATE TYPE "public"."identity_type" AS ENUM('domain', 'email');--> statement-breakpoint
CREATE TABLE "address" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.address',
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar,
	"street" varchar,
	"area" varchar,
	"city" varchar,
	"state" varchar,
	"country" varchar,
	"postal_code" varchar,
	"is_primary" boolean DEFAULT true,
	"organization_id" varchar
);
--> statement-breakpoint
CREATE TABLE "api_key" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.api_key',
	"name" varchar NOT NULL,
	"claims" jsonb NOT NULL,
	"key_hash" varchar NOT NULL,
	"prefix" varchar NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar,
	CONSTRAINT "api_key_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "campaign" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.campaign',
	"name" varchar,
	"subject" varchar,
	"logo_key" varchar,
	"logo_bucket" varchar,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar,
	"start_time" timestamp,
	"normalized_name" varchar,
	"status" "campaign_status" DEFAULT 'draft',
	"identity_id" varchar,
	"failure_reason" varchar
);
--> statement-breakpoint
CREATE TABLE "campaign_recipient" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.campaign_recipient',
	"campaign_id" varchar,
	"recipient_id" varchar,
	"send_status" "campaign_recipient_send_status" DEFAULT 'pending',
	"sent_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar
);
--> statement-breakpoint
CREATE TABLE "contact_details" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.contact_details',
	"email_id" varchar,
	"country_code" varchar,
	"phone_number" varchar,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar,
	"organization_id" varchar
);
--> statement-breakpoint
CREATE TABLE "group" (
	"id" varchar PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar,
	"entity" varchar DEFAULT 'mail_rocket.group',
	"name" varchar,
	"campaign_id" varchar,
	"normalized_name" varchar
);
--> statement-breakpoint
CREATE TABLE "identity" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.identity',
	"type" "identity_type" NOT NULL,
	"identity" varchar NOT NULL,
	"status" "identity_status" DEFAULT 'pending',
	"verification_records" jsonb,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.organization',
	"name" varchar,
	"normalized_name" varchar,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar
);
--> statement-breakpoint
CREATE TABLE "recipients" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.recipients',
	"first_name" varchar,
	"last_name" varchar,
	"normalized_name" varchar,
	"email_id" varchar,
	"group_id" varchar,
	"campaign_id" varchar,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar
);
--> statement-breakpoint
CREATE TABLE "template" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.template',
	"name" varchar,
	"html_body" varchar,
	"campaign_id" varchar,
	"normalized_name" varchar,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar
);
--> statement-breakpoint
ALTER TABLE "address" ADD CONSTRAINT "address_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_identity_id_identity_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipient" ADD CONSTRAINT "campaign_recipient_campaign_id_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipient" ADD CONSTRAINT "campaign_recipient_recipient_id_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_details" ADD CONSTRAINT "contact_details_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group" ADD CONSTRAINT "group_campaign_id_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipients" ADD CONSTRAINT "recipients_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipients" ADD CONSTRAINT "recipients_campaign_id_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template" ADD CONSTRAINT "template_campaign_id_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "address_organization_id_idx" ON "address" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "campaign_recipient_campaign_id_idx" ON "campaign_recipient" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_recipient_recipient_id_idx" ON "campaign_recipient" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "campaign_recipient_campaign_id_send_status_idx" ON "campaign_recipient" USING btree ("campaign_id","send_status");--> statement-breakpoint
CREATE INDEX "contact_details_organization_id_idx" ON "contact_details" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "group_campaign_id_idx" ON "group" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "recipients_group_id_idx" ON "recipients" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "recipients_campaign_id_idx" ON "recipients" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "template_campaign_id_idx" ON "template" USING btree ("campaign_id");
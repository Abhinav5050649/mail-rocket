CREATE TYPE "public"."campaign_recipient_send_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "campaign_recipient" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.campaign_recipient',
	"campaign_id" varchar,
	"recipient_id" varchar,
	"send_status" "campaign_recipient_send_status" DEFAULT 'pending',
	"sent_at" timestamp,
	"organization_id" varchar,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar
);
--> statement-breakpoint
ALTER TABLE "campaign" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "campaign" ALTER COLUMN "status" SET DEFAULT 'draft'::text;--> statement-breakpoint
DROP TYPE "public"."campaign_status";--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'sending', 'sent', 'send_failed');--> statement-breakpoint
ALTER TABLE "campaign" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."campaign_status";--> statement-breakpoint
ALTER TABLE "campaign" ALTER COLUMN "status" SET DATA TYPE "public"."campaign_status" USING "status"::"public"."campaign_status";--> statement-breakpoint
ALTER TABLE "campaign" ADD COLUMN "identity_id" varchar;--> statement-breakpoint
ALTER TABLE "campaign" ADD COLUMN "send_failure_reason" varchar;--> statement-breakpoint
ALTER TABLE "campaign_recipient" ADD CONSTRAINT "campaign_recipient_campaign_id_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipient" ADD CONSTRAINT "campaign_recipient_recipient_id_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipient" ADD CONSTRAINT "campaign_recipient_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_recipient_campaign_id_idx" ON "campaign_recipient" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_recipient_recipient_id_idx" ON "campaign_recipient" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "campaign_recipient_campaign_id_send_status_idx" ON "campaign_recipient" USING btree ("campaign_id","send_status");--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_identity_id_identity_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identity"("id") ON DELETE no action ON UPDATE no action;
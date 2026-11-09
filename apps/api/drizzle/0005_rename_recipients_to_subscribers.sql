-- Custom migration (generated empty with `drizzle-kit generate --custom`):
-- renames "recipients" to "subscribers" everywhere in the schema - tables,
-- columns, indexes, constraints, `entity` defaults and the `entity` values
-- already stored - and the per-send `campaign_recipient` table to
-- `campaign_delivery`, with its `send_status` column and enum becoming
-- `status`/`campaign_delivery_status`. Done as renames rather than
-- drop-and-create so existing rows are kept.
ALTER TABLE "recipients" RENAME TO "subscribers";--> statement-breakpoint
ALTER TABLE "campaign_recipient" RENAME TO "campaign_delivery";--> statement-breakpoint
ALTER TABLE "group_recipient" RENAME TO "group_subscriber";--> statement-breakpoint
ALTER TABLE "campaign_delivery" RENAME COLUMN "recipient_id" TO "subscriber_id";--> statement-breakpoint
ALTER TABLE "campaign_delivery" RENAME COLUMN "send_status" TO "status";--> statement-breakpoint
ALTER TABLE "group_subscriber" RENAME COLUMN "recipient_id" TO "subscriber_id";--> statement-breakpoint
ALTER TYPE "public"."campaign_recipient_send_status" RENAME TO "campaign_delivery_status";--> statement-breakpoint
ALTER TABLE "subscribers" RENAME CONSTRAINT "recipients_pkey" TO "subscribers_pkey";--> statement-breakpoint
ALTER TABLE "campaign_delivery" RENAME CONSTRAINT "campaign_recipient_pkey" TO "campaign_delivery_pkey";--> statement-breakpoint
ALTER TABLE "group_subscriber" RENAME CONSTRAINT "group_recipient_pkey" TO "group_subscriber_pkey";--> statement-breakpoint
ALTER TABLE "subscribers" RENAME CONSTRAINT "recipients_campaign_id_campaign_id_fk" TO "subscribers_campaign_id_campaign_id_fk";--> statement-breakpoint
ALTER TABLE "campaign_delivery" RENAME CONSTRAINT "campaign_recipient_campaign_id_campaign_id_fk" TO "campaign_delivery_campaign_id_campaign_id_fk";--> statement-breakpoint
ALTER TABLE "campaign_delivery" RENAME CONSTRAINT "campaign_recipient_recipient_id_recipients_id_fk" TO "campaign_delivery_subscriber_id_subscribers_id_fk";--> statement-breakpoint
ALTER TABLE "group_subscriber" RENAME CONSTRAINT "group_recipient_group_id_group_id_fk" TO "group_subscriber_group_id_group_id_fk";--> statement-breakpoint
ALTER TABLE "group_subscriber" RENAME CONSTRAINT "group_recipient_recipient_id_recipients_id_fk" TO "group_subscriber_subscriber_id_subscribers_id_fk";--> statement-breakpoint
ALTER TABLE "group_subscriber" RENAME CONSTRAINT "group_recipient_group_id_recipient_id_unique" TO "group_subscriber_group_id_subscriber_id_unique";--> statement-breakpoint
ALTER INDEX "recipients_campaign_id_idx" RENAME TO "subscribers_campaign_id_idx";--> statement-breakpoint
ALTER INDEX "campaign_recipient_campaign_id_idx" RENAME TO "campaign_delivery_campaign_id_idx";--> statement-breakpoint
ALTER INDEX "campaign_recipient_recipient_id_idx" RENAME TO "campaign_delivery_subscriber_id_idx";--> statement-breakpoint
ALTER INDEX "campaign_recipient_campaign_id_send_status_idx" RENAME TO "campaign_delivery_campaign_id_status_idx";--> statement-breakpoint
ALTER INDEX "group_recipient_recipient_id_idx" RENAME TO "group_subscriber_subscriber_id_idx";--> statement-breakpoint
ALTER TABLE "subscribers" ALTER COLUMN "entity" SET DEFAULT 'mail_rocket.subscribers';--> statement-breakpoint
ALTER TABLE "campaign_delivery" ALTER COLUMN "entity" SET DEFAULT 'mail_rocket.campaign_delivery';--> statement-breakpoint
ALTER TABLE "group_subscriber" ALTER COLUMN "entity" SET DEFAULT 'mail_rocket.group_subscriber';--> statement-breakpoint
UPDATE "subscribers" SET "entity" = 'mail_rocket.subscribers' WHERE "entity" = 'mail_rocket.recipients';--> statement-breakpoint
UPDATE "campaign_delivery" SET "entity" = 'mail_rocket.campaign_delivery' WHERE "entity" = 'mail_rocket.campaign_recipient';--> statement-breakpoint
UPDATE "group_subscriber" SET "entity" = 'mail_rocket.group_subscriber' WHERE "entity" = 'mail_rocket.group_recipient';

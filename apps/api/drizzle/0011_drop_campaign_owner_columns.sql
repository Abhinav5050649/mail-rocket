ALTER TABLE "group" DROP CONSTRAINT "group_campaign_id_campaign_id_fk";
--> statement-breakpoint
ALTER TABLE "template" DROP CONSTRAINT "template_campaign_id_campaign_id_fk";
--> statement-breakpoint
ALTER TABLE "subscribers" DROP CONSTRAINT "subscribers_campaign_id_campaign_id_fk";
--> statement-breakpoint
DROP INDEX "group_campaign_id_idx";--> statement-breakpoint
DROP INDEX "template_campaign_id_idx";--> statement-breakpoint
DROP INDEX "subscribers_campaign_id_idx";--> statement-breakpoint
ALTER TABLE "group" DROP COLUMN "campaign_id";--> statement-breakpoint
ALTER TABLE "template" DROP COLUMN "campaign_id";--> statement-breakpoint
ALTER TABLE "subscribers" DROP COLUMN "campaign_id";
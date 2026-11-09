ALTER TABLE "campaign_delivery" ADD COLUMN "unsubscribed_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "unsubscribed_at" timestamp;
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('viewer', 'editor', 'admin');--> statement-breakpoint
ALTER TABLE "campaign" ADD COLUMN "status" "campaign_status" DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" "user_role" DEFAULT 'viewer';
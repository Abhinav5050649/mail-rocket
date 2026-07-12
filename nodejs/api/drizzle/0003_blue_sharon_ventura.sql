CREATE TYPE "public"."identity_status" AS ENUM('created', 'active');--> statement-breakpoint
ALTER TABLE "identity" ADD COLUMN "status" "identity_status" DEFAULT 'created';
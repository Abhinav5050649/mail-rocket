ALTER TABLE "identity" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "identity" ADD COLUMN "verification_records" jsonb;
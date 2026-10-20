ALTER TABLE "recipients" DROP CONSTRAINT "recipients_group_id_group_id_fk";
--> statement-breakpoint
DROP INDEX "recipients_group_id_idx";--> statement-breakpoint
ALTER TABLE "recipients" DROP COLUMN "group_id";
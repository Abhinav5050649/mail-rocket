ALTER TABLE "user" DROP CONSTRAINT "user_organization_id_organization_id_fk";
--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "organization_id";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "role";--> statement-breakpoint
DROP TYPE "public"."user_role";
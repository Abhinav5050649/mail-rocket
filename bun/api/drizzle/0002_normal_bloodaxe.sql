CREATE TYPE "public"."identity_type" AS ENUM('domain', 'email');--> statement-breakpoint
CREATE TABLE "identity" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.identity',
	"type" "identity_type" NOT NULL,
	"identity" varchar NOT NULL,
	"organization_id" varchar,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar
);
--> statement-breakpoint
ALTER TABLE "identity" ADD CONSTRAINT "identity_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;
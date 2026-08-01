CREATE TYPE "public"."organization_user_role" AS ENUM('viewer', 'editor', 'admin');--> statement-breakpoint
CREATE TABLE "organization_user" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.organization_user',
	"organization_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"role" "organization_user_role" DEFAULT 'viewer',
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar,
	CONSTRAINT "organization_user_organization_id_user_id_unique" UNIQUE("organization_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "organization_user" ADD CONSTRAINT "organization_user_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_user" ADD CONSTRAINT "organization_user_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
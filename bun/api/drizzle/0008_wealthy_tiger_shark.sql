CREATE TABLE "template" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.template',
	"name" varchar,
	"html_body" varchar,
	"campaign_id" varchar,
	"organization_id" varchar,
	"normalized_name" varchar,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar
);
--> statement-breakpoint
ALTER TABLE "template" ADD CONSTRAINT "template_campaign_id_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template" ADD CONSTRAINT "template_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "template_campaign_id_idx" ON "template" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "template_organization_id_idx" ON "template" USING btree ("organization_id");
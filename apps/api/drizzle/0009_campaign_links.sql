CREATE TABLE "campaign_group" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.campaign_group',
	"campaign_id" varchar NOT NULL,
	"group_id" varchar NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar,
	CONSTRAINT "campaign_group_campaign_id_group_id_unique" UNIQUE("campaign_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "campaign_subscriber" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.campaign_subscriber',
	"campaign_id" varchar NOT NULL,
	"subscriber_id" varchar NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar,
	CONSTRAINT "campaign_subscriber_campaign_id_subscriber_id_unique" UNIQUE("campaign_id","subscriber_id")
);
--> statement-breakpoint
ALTER TABLE "campaign" ADD COLUMN "template_id" varchar;--> statement-breakpoint
ALTER TABLE "campaign_group" ADD CONSTRAINT "campaign_group_campaign_id_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_group" ADD CONSTRAINT "campaign_group_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_subscriber" ADD CONSTRAINT "campaign_subscriber_campaign_id_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_subscriber" ADD CONSTRAINT "campaign_subscriber_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_group_group_id_idx" ON "campaign_group" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "campaign_subscriber_subscriber_id_idx" ON "campaign_subscriber" USING btree ("subscriber_id");--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_template_id_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."template"("id") ON DELETE set null ON UPDATE no action;
CREATE TABLE "group_recipient" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.group_recipient',
	"group_id" varchar NOT NULL,
	"recipient_id" varchar NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar,
	CONSTRAINT "group_recipient_group_id_recipient_id_unique" UNIQUE("group_id","recipient_id")
);
--> statement-breakpoint
ALTER TABLE "group_recipient" ADD CONSTRAINT "group_recipient_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_recipient" ADD CONSTRAINT "group_recipient_recipient_id_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_recipient_recipient_id_idx" ON "group_recipient" USING btree ("recipient_id");
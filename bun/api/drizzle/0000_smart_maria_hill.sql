CREATE TABLE "address" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.address',
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar,
	"street" varchar,
	"area" varchar,
	"city" varchar,
	"state" varchar,
	"country" varchar,
	"postal_code" varchar,
	"is_primary" boolean DEFAULT true,
	"organization_id" varchar,
	"user_id" varchar
);
--> statement-breakpoint
CREATE TABLE "campaign" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.campaign',
	"name" varchar,
	"subject" varchar,
	"logo_key" varchar,
	"logo_bucket" varchar,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar,
	"organization_id" varchar,
	"start_time" timestamp,
	"organizer_id" varchar,
	"normalized_name" varchar
);
--> statement-breakpoint
CREATE TABLE "contact_details" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.contact_details',
	"email_id" varchar,
	"country_code" varchar,
	"phone_number" varchar,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar,
	"organization_id" varchar,
	"user_id" varchar
);
--> statement-breakpoint
CREATE TABLE "group" (
	"id" varchar PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar,
	"entity" varchar DEFAULT 'mail_rocket.group',
	"name" varchar,
	"campaign_id" varchar,
	"organization_id" varchar,
	"creator_id" varchar,
	"normalized_name" varchar
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.organization',
	"name" varchar,
	"normalized_name" varchar,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar
);
--> statement-breakpoint
CREATE TABLE "recipients" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.recipients',
	"first_name" varchar,
	"last_name" varchar,
	"normalized_name" varchar,
	"email_id" varchar,
	"group_id" varchar,
	"campaign_id" varchar,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar,
	"organization_id" varchar
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity" varchar DEFAULT 'mail_rocket.user',
	"first_name" varchar,
	"last_name" varchar,
	"organization_id" varchar,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar,
	"normalized_name" varchar
);
--> statement-breakpoint
ALTER TABLE "address" ADD CONSTRAINT "address_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "address" ADD CONSTRAINT "address_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_organizer_id_user_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_details" ADD CONSTRAINT "contact_details_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_details" ADD CONSTRAINT "contact_details_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group" ADD CONSTRAINT "group_campaign_id_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group" ADD CONSTRAINT "group_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group" ADD CONSTRAINT "group_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipients" ADD CONSTRAINT "recipients_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipients" ADD CONSTRAINT "recipients_campaign_id_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipients" ADD CONSTRAINT "recipients_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
COMMENT ON COLUMN "address"."id" IS 'UUID to uniquely identify address';
COMMENT ON COLUMN "address"."entity" IS 'Denotes the type of object and the domain it belongs to';
COMMENT ON COLUMN "address"."created_at" IS 'Epoch when record was created';
COMMENT ON COLUMN "address"."updated_at" IS 'Epoch when record was updated';
COMMENT ON COLUMN "address"."description" IS 'Field to store additional metadata about record';
COMMENT ON COLUMN "address"."street" IS 'Street where organization is located';
COMMENT ON COLUMN "address"."area" IS 'Area where organization is located';
COMMENT ON COLUMN "address"."city" IS 'City where organization is located';
COMMENT ON COLUMN "address"."state" IS 'State where organization is located';
COMMENT ON COLUMN "address"."country" IS 'Country where organization is located';
COMMENT ON COLUMN "address"."postal_code" IS 'Postal Code of Area where organization is located';
COMMENT ON COLUMN "address"."is_primary" IS 'Denotes whether this record is the primary address of the organization or not';
COMMENT ON COLUMN "address"."organization_id" IS 'ID of organization';
COMMENT ON COLUMN "address"."user_id" IS 'ID of user';

COMMENT ON COLUMN "campaign"."id" IS 'UUID to uniquely identify campaign';
COMMENT ON COLUMN "campaign"."entity" IS 'Denotes the type of object and the domain it belongs to';
COMMENT ON COLUMN "campaign"."name" IS 'Name of campaign';
COMMENT ON COLUMN "campaign"."subject" IS 'Subject line of the campaign email';
COMMENT ON COLUMN "campaign"."logo_key" IS 'Storage key/path of the campaign logo';
COMMENT ON COLUMN "campaign"."logo_bucket" IS 'Storage bucket where the campaign logo is stored';
COMMENT ON COLUMN "campaign"."created_at" IS 'Timestamp when record was created';
COMMENT ON COLUMN "campaign"."updated_at" IS 'Timestamp when record was updated';
COMMENT ON COLUMN "campaign"."description" IS 'Field to store additional metadata about record';
COMMENT ON COLUMN "campaign"."organization_id" IS 'ID of organization the campaign belongs to';
COMMENT ON COLUMN "campaign"."start_time" IS 'Timestamp when the campaign starts/started';
COMMENT ON COLUMN "campaign"."organizer_id" IS 'ID of user organizing the campaign';
COMMENT ON COLUMN "campaign"."normalized_name" IS 'Normalized name of campaign';

COMMENT ON COLUMN "contact_details"."id" IS 'UUID to uniquely identify contact';
COMMENT ON COLUMN "contact_details"."entity" IS 'Denotes the type of record and the domain which it belongs to';
COMMENT ON COLUMN "contact_details"."email_id" IS 'Email ID';
COMMENT ON COLUMN "contact_details"."country_code" IS 'Country Code';
COMMENT ON COLUMN "contact_details"."phone_number" IS 'Phone number';
COMMENT ON COLUMN "contact_details"."created_at" IS 'Timestamp when record was created';
COMMENT ON COLUMN "contact_details"."updated_at" IS 'Timestamp when record was updated';
COMMENT ON COLUMN "contact_details"."description" IS 'To store additional metadata about contact';
COMMENT ON COLUMN "contact_details"."organization_id" IS 'Organization the contact detail is associated to';
COMMENT ON COLUMN "contact_details"."user_id" IS 'User the contact detail is associated to';

COMMENT ON COLUMN "group"."id" IS 'UUID to uniquely identify group';
COMMENT ON COLUMN "group"."created_at" IS 'Timestamp when record was created';
COMMENT ON COLUMN "group"."updated_at" IS 'Timestamp when record was updated';
COMMENT ON COLUMN "group"."description" IS 'Field to store additional metadata about record';
COMMENT ON COLUMN "group"."entity" IS 'Denotes the type of object and the domain it belongs to';
COMMENT ON COLUMN "group"."name" IS 'Name of group';
COMMENT ON COLUMN "group"."campaign_id" IS 'ID of campaign the group belongs to';
COMMENT ON COLUMN "group"."organization_id" IS 'ID of organization the group belongs to';
COMMENT ON COLUMN "group"."creator_id" IS 'ID of user who created the group';
COMMENT ON COLUMN "group"."normalized_name" IS 'Normalized name of group';

COMMENT ON COLUMN "organization"."id" IS 'UUID to uniquely identify organization';
COMMENT ON COLUMN "organization"."entity" IS 'Denotes the type of object and the domain it belongs to';
COMMENT ON COLUMN "organization"."name" IS 'Name of organization';
COMMENT ON COLUMN "organization"."normalized_name" IS 'Normalized Name of Organization';
COMMENT ON COLUMN "organization"."created_at" IS 'Date Epoch when entry was created';
COMMENT ON COLUMN "organization"."updated_at" IS 'Date epoch when record was updated';
COMMENT ON COLUMN "organization"."description" IS 'To store extra information about record';

COMMENT ON COLUMN "recipients"."id" IS 'UUID to uniquely identify recipient';
COMMENT ON COLUMN "recipients"."entity" IS 'Denotes the type of object and the domain it belongs to';
COMMENT ON COLUMN "recipients"."first_name" IS 'First name of recipient';
COMMENT ON COLUMN "recipients"."last_name" IS 'Last name of recipient';
COMMENT ON COLUMN "recipients"."normalized_name" IS 'Normalized name of recipient';
COMMENT ON COLUMN "recipients"."email_id" IS 'Email ID of recipient';
COMMENT ON COLUMN "recipients"."group_id" IS 'ID of group the recipient belongs to';
COMMENT ON COLUMN "recipients"."campaign_id" IS 'ID of campaign the recipient is associated with';
COMMENT ON COLUMN "recipients"."created_at" IS 'Timestamp when record was created';
COMMENT ON COLUMN "recipients"."updated_at" IS 'Timestamp when record was updated';
COMMENT ON COLUMN "recipients"."description" IS 'Field to store additional metadata about record';
COMMENT ON COLUMN "recipients"."organization_id" IS 'ID of organization the recipient belongs to';

COMMENT ON COLUMN "user"."id" IS 'UUID to identify user';
COMMENT ON COLUMN "user"."entity" IS 'Denotes domain the record belongs to';
COMMENT ON COLUMN "user"."first_name" IS 'First name of user';
COMMENT ON COLUMN "user"."last_name" IS 'Last name of user';
COMMENT ON COLUMN "user"."organization_id" IS 'ID of the organization the user belongs to';
COMMENT ON COLUMN "user"."created_at" IS 'Timestamp denoting the time when record was created';
COMMENT ON COLUMN "user"."updated_at" IS 'Timestamp denoting the time when record was updated';
COMMENT ON COLUMN "user"."description" IS 'Field to store additional metadata about record';
COMMENT ON COLUMN "user"."normalized_name" IS 'Normalized name of user';
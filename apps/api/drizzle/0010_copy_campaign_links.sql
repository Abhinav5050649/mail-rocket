-- Custom data migration (generated empty with `drizzle-kit generate --custom`):
-- carry each campaign's existing links over to the new model before the next
-- migration drops the old one-campaign `campaign_id` columns.

-- Groups that belonged to a campaign become that campaign's audience groups.
INSERT INTO "campaign_group" ("id", "campaign_id", "group_id", "created_at")
SELECT gen_random_uuid()::varchar, "campaign_id", "id", now()
FROM "group"
WHERE "campaign_id" IS NOT NULL
ON CONFLICT ("campaign_id", "group_id") DO NOTHING;
--> statement-breakpoint

-- Subscribers linked to a campaign directly become its individually picked subscribers.
INSERT INTO "campaign_subscriber" ("id", "campaign_id", "subscriber_id", "created_at")
SELECT gen_random_uuid()::varchar, "campaign_id", "id", now()
FROM "subscribers"
WHERE "campaign_id" IS NOT NULL
ON CONFLICT ("campaign_id", "subscriber_id") DO NOTHING;
--> statement-breakpoint

-- A campaign sent its most recently updated template, so that one becomes its chosen template.
UPDATE "campaign" SET "template_id" = latest."id"
FROM (
    SELECT DISTINCT ON ("campaign_id") "campaign_id", "id"
    FROM "template"
    WHERE "campaign_id" IS NOT NULL
    ORDER BY "campaign_id", "updated_at" DESC NULLS LAST, "created_at" DESC NULLS LAST
) AS latest
WHERE latest."campaign_id" = "campaign"."id";

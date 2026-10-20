-- Custom data migration (generated empty with `drizzle-kit generate --custom`):
-- copy each recipient's single `group_id` into the new many-to-many
-- `group_recipient` table before the next migration drops the column.
INSERT INTO "group_recipient" ("id", "group_id", "recipient_id", "created_at")
SELECT gen_random_uuid()::varchar, "group_id", "id", now()
FROM "recipients"
WHERE "group_id" IS NOT NULL
ON CONFLICT ("group_id", "recipient_id") DO NOTHING;

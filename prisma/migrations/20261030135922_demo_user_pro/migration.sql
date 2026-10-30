-- Give the demo user an active subscription, so the Pro features (file and
-- image uploads) can be tried before Stripe exists. Stripe's webhook will own
-- this row's status later; until then no user can become Pro another way.
-- A no-op when the demo user does not exist; safe to run twice.
-- The id is cuid-shaped ('c' + 24 lowercase hex chars), like the other data
-- migrations.
INSERT INTO "Subscription" ("id", "userId", "status", "createdAt", "updatedAt")
SELECT 'c' || substr(md5(gen_random_uuid()::text), 1, 24), u."id", 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User" u
WHERE u."email" = 'demo@devstash.io'
ON CONFLICT ("userId") DO UPDATE SET "status" = 'active', "updatedAt" = CURRENT_TIMESTAMP;

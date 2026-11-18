-- Data only, no schema change. Rows from before 2026-11-06 still hold GitHub's
-- tokens in plaintext; nothing reads or revokes them any more, so they are
-- removed. Safe for the deployment that is live: a null token only skips its
-- revoke loop.
UPDATE "Account"
SET "access_token" = NULL, "refresh_token" = NULL, "id_token" = NULL
WHERE "access_token" IS NOT NULL
   OR "refresh_token" IS NOT NULL
   OR "id_token" IS NOT NULL;

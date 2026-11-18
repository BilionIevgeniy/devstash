-- Expand only (ADR 0013): the live deployment never inserts an ItemType (only
-- the seeds do) and selects its columns by name, so a NOT NULL column it does
-- not know is safe. Every row so far is a system type, whose slug is its name
-- plus "s" (the URL segment of the type page before this column).
ALTER TABLE "ItemType" ADD COLUMN "slug" TEXT;

UPDATE "ItemType" SET "slug" = "name" || 's' WHERE "slug" IS NULL;

ALTER TABLE "ItemType" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ItemType_userId_slug_key" ON "ItemType"("userId", "slug");

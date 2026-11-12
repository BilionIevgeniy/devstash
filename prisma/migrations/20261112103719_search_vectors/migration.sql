-- Search in Postgres (ADR 0018): a stored tsvector per item and collection,
-- GIN indexes on them, and trigram indexes for typos in titles and names.
--
-- Every text goes through regexp_replace before to_tsvector, so "console.log",
-- "next.config.ts" or a URL become separate words; the query side
-- (toPrefixTsQuery in items/domain/search-text.ts) splits the same way.
-- 'simple' does no stemming: the content is code and several languages.
--
-- Order: searchTags is added and backfilled before the generated column
-- exists, so the backfill does not recompute the vector of every row. Each
-- ADD COLUMN ... STORED rewrites the table under an ACCESS EXCLUSIVE lock and
-- the CREATE INDEX statements block writes while they run; both are short at
-- the current size. Backward compatible: the live deployment never names the
-- new columns, and searchTags has a default.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "Item" ADD COLUMN "searchTags" TEXT NOT NULL DEFAULT '';

-- The same join as toSearchTags: names sorted, joined by spaces.
UPDATE "Item" AS i
SET "searchTags" = t.names
FROM (
  SELECT it."itemId", string_agg(tag."name", ' ' ORDER BY tag."name") AS names
  FROM "ItemTag" AS it
  JOIN "Tag" AS tag ON tag."id" = it."tagId"
  GROUP BY it."itemId"
) AS t
WHERE t."itemId" = i."id";

-- STORED is written out: Postgres 18 makes a generated column VIRTUAL by
-- default, and a virtual column cannot be indexed.
ALTER TABLE "Item" ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', regexp_replace("title", '[^[:alnum:]]+', ' ', 'g')), 'A') ||
  setweight(to_tsvector('simple', regexp_replace("searchTags", '[^[:alnum:]]+', ' ', 'g')), 'A') ||
  setweight(to_tsvector('simple', regexp_replace(coalesce("description", ''), '[^[:alnum:]]+', ' ', 'g')), 'B') ||
  setweight(to_tsvector('simple', regexp_replace(coalesce("content", '') || ' ' || coalesce("url", ''), '[^[:alnum:]]+', ' ', 'g')), 'C')
) STORED;

ALTER TABLE "Collection" ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', regexp_replace("name", '[^[:alnum:]]+', ' ', 'g')), 'A') ||
  setweight(to_tsvector('simple', regexp_replace(coalesce("description", ''), '[^[:alnum:]]+', ' ', 'g')), 'B')
) STORED;

CREATE INDEX "Item_searchVector_idx" ON "Item" USING GIN ("searchVector");
CREATE INDEX "Item_title_idx" ON "Item" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "Collection_searchVector_idx" ON "Collection" USING GIN ("searchVector");
CREATE INDEX "Collection_name_idx" ON "Collection" USING GIN ("name" gin_trgm_ops);

-- A favorite always has its star date, and a row that is not a favorite has
-- none: the endless /favorites list pages by favoritedAt (ADR 0025), so a
-- null there would fall outside every page. Every writer already sets both
-- together (setUserItemFavorite, the seed; an import restores no favorites),
-- so the live deployment keeps working. Prisma cannot express a CHECK; the
-- comment on Item.favoritedAt in schema.prisma names it.

-- Rows written before the add_favorited_at backfill, if any.
UPDATE "Item" SET "favoritedAt" = "updatedAt" WHERE "isFavorite" AND "favoritedAt" IS NULL;
UPDATE "Item" SET "favoritedAt" = NULL WHERE NOT "isFavorite" AND "favoritedAt" IS NOT NULL;

ALTER TABLE "Item"
  ADD CONSTRAINT "Item_favoritedAt_matches_isFavorite"
  CHECK ("isFavorite" = ("favoritedAt" IS NOT NULL));

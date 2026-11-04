-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "favoritedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "favoritedAt" TIMESTAMP(3);

-- Existing favorites have no star date: their last change is the closest thing.
UPDATE "Collection" SET "favoritedAt" = "updatedAt" WHERE "isFavorite";
UPDATE "Item" SET "favoritedAt" = "updatedAt" WHERE "isFavorite";

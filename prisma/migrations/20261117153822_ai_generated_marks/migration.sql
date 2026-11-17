-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "contentAiGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "descriptionAiGenerated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ItemTag" ADD COLUMN     "aiGenerated" BOOLEAN NOT NULL DEFAULT false;

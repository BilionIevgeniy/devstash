-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "fileKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Item_fileKey_key" ON "Item"("fileKey");


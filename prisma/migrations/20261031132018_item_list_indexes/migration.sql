-- DropIndex
DROP INDEX "Item_userId_idx";

-- CreateIndex
CREATE INDEX "Item_userId_createdAt_idx" ON "Item"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Item_userId_typeId_createdAt_idx" ON "Item"("userId", "typeId", "createdAt");

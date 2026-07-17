-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "importBatchId" TEXT;

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "preset" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorReport" TEXT NOT NULL DEFAULT '[]',
    "attestedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportBatch_shop_idx" ON "ImportBatch"("shop");

-- CreateIndex
CREATE INDEX "Review_shop_importBatchId_idx" ON "Review"("shop", "importBatchId");

-- CreateIndex
CREATE INDEX "Review_shop_externalRef_idx" ON "Review"("shop", "externalRef");

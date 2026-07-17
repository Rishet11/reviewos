-- AlterTable
ALTER TABLE "MarketplaceStat" ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "refreshSource" TEXT NOT NULL DEFAULT 'manual';

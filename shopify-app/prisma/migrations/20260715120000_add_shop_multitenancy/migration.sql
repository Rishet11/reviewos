-- DropIndex
DROP INDEX "AiSummary_productId_scope_cohortKey_key";

-- DropIndex
DROP INDEX "AttributeDefinition_productCategory_key_key";

-- DropIndex
DROP INDEX "MarketplaceSource_name_key";

-- DropIndex
DROP INDEX "MarketplaceStat_productId_sourceId_key";

-- DropIndex
DROP INDEX "Product_slug_key";

-- DropIndex
DROP INDEX "Settings_key_key";

-- AlterTable: add shop nullable first, backfill, then enforce NOT NULL
-- (existing dev-seed rows predate multi-tenancy; backfilled to the dev
-- store domain rather than resetting the database).
ALTER TABLE "AiSummary" ADD COLUMN "shop" TEXT;
UPDATE "AiSummary" SET "shop" = 'reviewos-dev.myshopify.com' WHERE "shop" IS NULL;
ALTER TABLE "AiSummary" ALTER COLUMN "shop" SET NOT NULL;

ALTER TABLE "AttributeDefinition" ADD COLUMN "shop" TEXT;
UPDATE "AttributeDefinition" SET "shop" = 'reviewos-dev.myshopify.com' WHERE "shop" IS NULL;
ALTER TABLE "AttributeDefinition" ALTER COLUMN "shop" SET NOT NULL;

ALTER TABLE "MarketplaceSource" ADD COLUMN "shop" TEXT;
UPDATE "MarketplaceSource" SET "shop" = 'reviewos-dev.myshopify.com' WHERE "shop" IS NULL;
ALTER TABLE "MarketplaceSource" ALTER COLUMN "shop" SET NOT NULL;

ALTER TABLE "MarketplaceStat" ADD COLUMN "shop" TEXT;
UPDATE "MarketplaceStat" SET "shop" = 'reviewos-dev.myshopify.com' WHERE "shop" IS NULL;
ALTER TABLE "MarketplaceStat" ALTER COLUMN "shop" SET NOT NULL;

ALTER TABLE "Product" ADD COLUMN "shop" TEXT;
UPDATE "Product" SET "shop" = 'reviewos-dev.myshopify.com' WHERE "shop" IS NULL;
ALTER TABLE "Product" ALTER COLUMN "shop" SET NOT NULL;

ALTER TABLE "Review" ADD COLUMN "shop" TEXT;
UPDATE "Review" SET "shop" = 'reviewos-dev.myshopify.com' WHERE "shop" IS NULL;
ALTER TABLE "Review" ALTER COLUMN "shop" SET NOT NULL;

ALTER TABLE "Settings" ADD COLUMN "shop" TEXT;
UPDATE "Settings" SET "shop" = 'reviewos-dev.myshopify.com' WHERE "shop" IS NULL;
ALTER TABLE "Settings" ALTER COLUMN "shop" SET NOT NULL;

-- CreateIndex
CREATE INDEX "AiSummary_shop_idx" ON "AiSummary"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "AiSummary_shop_productId_scope_cohortKey_key" ON "AiSummary"("shop", "productId", "scope", "cohortKey");

-- CreateIndex
CREATE INDEX "AttributeDefinition_shop_idx" ON "AttributeDefinition"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeDefinition_shop_productCategory_key_key" ON "AttributeDefinition"("shop", "productCategory", "key");

-- CreateIndex
CREATE INDEX "MarketplaceSource_shop_idx" ON "MarketplaceSource"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceSource_shop_name_key" ON "MarketplaceSource"("shop", "name");

-- CreateIndex
CREATE INDEX "MarketplaceStat_shop_idx" ON "MarketplaceStat"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceStat_shop_productId_sourceId_key" ON "MarketplaceStat"("shop", "productId", "sourceId");

-- CreateIndex
CREATE INDEX "Product_shop_idx" ON "Product"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "Product_shop_slug_key" ON "Product"("shop", "slug");

-- CreateIndex
CREATE INDEX "Review_shop_idx" ON "Review"("shop");

-- CreateIndex
CREATE INDEX "Review_shop_productId_status_idx" ON "Review"("shop", "productId", "status");

-- CreateIndex
CREATE INDEX "Settings_shop_idx" ON "Settings"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_shop_key_key" ON "Settings"("shop", "key");

-- Phase 6 Slice B: verified-buyer / order linkage.
--
-- NOT AUTO-APPLIED. `prisma migrate dev --create-only` was attempted and
-- refused (same as Slice A): this database has pre-existing drift vs.
-- migration history (a `Product.shopifyProductId` column with no matching
-- migration file, predating any of this work), which makes `prisma migrate
-- dev` refuse to run non-destructively regardless of this change.
--
-- Unlike Slice A, everything in this migration is low-risk on its own:
--   - `OrderCapture` / `OrderLineItem` are brand-new tables (no existing
--     rows, no data-loss risk).
--   - `Review.verifiedOrderId` is a new NULLABLE column with no backfill
--     needed (existing rows just get NULL).
-- Written by hand so the shape is correct and reviewable. Apply manually
-- after reviewing, e.g.:
--   psql "$DATABASE_URL" -f prisma/migrations/20260716120000_review_order_capture/migration.sql
-- then run `npx prisma migrate resolve --applied 20260716120000_review_order_capture`
-- to mark it applied in _prisma_migrations (once migration history drift is
-- separately resolved by the user - same outstanding item as Slice A's
-- migration).

-- 1. New order-capture tables (brand new, no existing data / no risk).
CREATE TABLE "OrderCapture" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "orderName" TEXT,
    "customerEmail" TEXT,
    "customerId" TEXT,
    "financialStatus" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderCapture_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderLineItem" (
    "id" TEXT NOT NULL,
    "orderCaptureId" TEXT NOT NULL,
    "shopifyProductId" TEXT,
    "shopifyVariantId" TEXT,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "OrderLineItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderCapture_shop_shopifyOrderId_key" ON "OrderCapture"("shop", "shopifyOrderId");
CREATE INDEX "OrderCapture_shop_idx" ON "OrderCapture"("shop");
CREATE INDEX "OrderCapture_shop_customerEmail_idx" ON "OrderCapture"("shop", "customerEmail");

CREATE INDEX "OrderLineItem_orderCaptureId_idx" ON "OrderLineItem"("orderCaptureId");
CREATE INDEX "OrderLineItem_shopifyProductId_idx" ON "OrderLineItem"("shopifyProductId");

ALTER TABLE "OrderLineItem" ADD CONSTRAINT "OrderLineItem_orderCaptureId_fkey" FOREIGN KEY ("orderCaptureId") REFERENCES "OrderCapture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. New nullable column on Review (safe, no backfill: existing rows -> NULL,
--    meaning "not verified via order linkage" which matches their current
--    behavior since verifiedBuyer already defaults to false).
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "verifiedOrderId" TEXT;

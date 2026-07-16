-- Phase 6 Slice A: media upload storage fields.
--
-- NOT AUTO-APPLIED. `prisma migrate dev` / `db push --accept-data-loss` were
-- blocked by the harness's safety layer because:
--   1. `ReviewMedia` already has 121 rows (seed data) and this schema change
--      adds NOT NULL columns with no default.
--   2. This database already had unrelated drift vs. migration history
--      (a `Product.shopifyProductId` column with no matching migration file)
--      pre-dating this task, which makes `prisma migrate dev` refuse to run
--      non-destructively regardless of this change.
-- This file is written by hand so the shape is correct and reviewable. It
-- backfills existing rows with placeholder values (all 121 existing rows are
-- type="image" seed/demo media) before enforcing NOT NULL, so no data is
-- lost. Apply manually after reviewing, e.g.:
--   psql "$DATABASE_URL" -f prisma/migrations/20260715172013_review_media_r2_fields/migration.sql
-- then run `npx prisma migrate resolve --applied 20260715172013_review_media_r2_fields`
-- to mark it applied in _prisma_migrations (once migration history drift is
-- separately resolved by the user).

-- 1. Add new ReviewMedia columns, nullable first (safe, no data loss).
ALTER TABLE "ReviewMedia" ADD COLUMN IF NOT EXISTS "storageKey" TEXT;
ALTER TABLE "ReviewMedia" ADD COLUMN IF NOT EXISTS "mimeType" TEXT;
ALTER TABLE "ReviewMedia" ADD COLUMN IF NOT EXISTS "sizeBytes" INTEGER;
ALTER TABLE "ReviewMedia" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;

-- 2. Backfill existing rows with placeholder values derived from existing
--    data (id as a synthetic storage key, mimeType from `type`, size unknown
--    so 0). These are legacy seed rows never uploaded through R2.
UPDATE "ReviewMedia"
SET
  "storageKey" = 'legacy/' || id,
  "mimeType" = CASE WHEN "type" = 'video' THEN 'video/mp4' ELSE 'image/jpeg' END,
  "sizeBytes" = 0
WHERE "storageKey" IS NULL;

-- 3. Now safe to enforce NOT NULL.
ALTER TABLE "ReviewMedia" ALTER COLUMN "storageKey" SET NOT NULL;
ALTER TABLE "ReviewMedia" ALTER COLUMN "mimeType" SET NOT NULL;
ALTER TABLE "ReviewMedia" ALTER COLUMN "sizeBytes" SET NOT NULL;

-- 4. New orphan-tracking table (brand new, no existing data / no risk).
CREATE TABLE "PendingReviewMedia" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingReviewMedia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PendingReviewMedia_shop_idx" ON "PendingReviewMedia"("shop");
CREATE INDEX "PendingReviewMedia_createdAt_idx" ON "PendingReviewMedia"("createdAt");

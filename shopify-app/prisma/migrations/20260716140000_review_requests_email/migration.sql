-- Phase 6 Slice C: post-purchase review-request email.
--
-- NOT AUTO-APPLIED. Same pre-existing migration-history drift as Slices A/B
-- (`Product.shopifyProductId` column with no matching migration file) makes
-- `prisma migrate dev` refuse to run non-destructively regardless of this
-- change. Written by hand so the shape is correct and reviewable.
--
-- Zero risk on its own: `ReviewRequest` and `EmailSuppression` are brand-new
-- tables, no existing rows, no backfill. Apply manually after review, e.g.:
--   psql "$DATABASE_URL" -f prisma/migrations/20260716140000_review_requests_email/migration.sql
-- then run:
--   npx prisma migrate resolve --applied 20260716140000_review_requests_email
-- to mark it applied in _prisma_migrations (once migration history drift is
-- separately resolved by the user - same outstanding item as Slices A/B).

CREATE TABLE "ReviewRequest" (
    "id"                TEXT NOT NULL,
    "shop"              TEXT NOT NULL,
    "productId"         TEXT NOT NULL,
    "shopifyOrderId"    TEXT NOT NULL,
    "orderCaptureId"    TEXT,
    "shopifyCustomerId" TEXT,
    "customerEmail"     TEXT NOT NULL,
    "customerName"      TEXT,
    "cohort"            TEXT NOT NULL DEFAULT 'first_time',
    "channel"           TEXT NOT NULL DEFAULT 'email',
    "deliveredAt"       TIMESTAMP(3) NOT NULL,
    "scheduledSendAt"   TIMESTAMP(3) NOT NULL,
    "status"            TEXT NOT NULL DEFAULT 'pending',
    "sentCount"         INTEGER NOT NULL DEFAULT 0,
    "lastSentAt"        TIMESTAMP(3),
    "failedAttempts"    INTEGER NOT NULL DEFAULT 0,
    "lastError"         TEXT,
    "completedReviewId" TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailSuppression" (
    "id"        TEXT NOT NULL,
    "shop"      TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "reason"    TEXT NOT NULL DEFAULT 'unsubscribe',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReviewRequest_shop_shopifyOrderId_productId_key" ON "ReviewRequest"("shop", "shopifyOrderId", "productId");
CREATE INDEX "ReviewRequest_shop_idx" ON "ReviewRequest"("shop");
CREATE INDEX "ReviewRequest_shop_status_scheduledSendAt_idx" ON "ReviewRequest"("shop", "status", "scheduledSendAt");

CREATE UNIQUE INDEX "EmailSuppression_shop_email_key" ON "EmailSuppression"("shop", "email");
CREATE INDEX "EmailSuppression_shop_idx" ON "EmailSuppression"("shop");

ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

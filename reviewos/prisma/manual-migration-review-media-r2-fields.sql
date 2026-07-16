-- Phase 6 Slice A: media upload storage fields (demo app).
--
-- NOT AUTO-APPLIED. The demo app has no prisma/migrations history (schema
-- has always been synced via `prisma db push`), and `ReviewMedia` already
-- has 62 rows (seed data, all type="image", picsum.photos URLs). Adding
-- required columns with no default via `db push --accept-data-loss` was
-- blocked by the harness's safety layer as a data-loss-risk operation
-- requiring explicit user sign-off. This file does the same thing safely by
-- hand: add nullable, backfill, then enforce NOT NULL. Apply manually, e.g.:
--   psql "$DATABASE_URL" -f prisma/manual-migration-review-media-r2-fields.sql
-- Afterwards `npx prisma db push` should report no drift (schema.prisma
-- already matches this end state).

ALTER TABLE "ReviewMedia" ADD COLUMN IF NOT EXISTS "storageKey" TEXT;
ALTER TABLE "ReviewMedia" ADD COLUMN IF NOT EXISTS "mimeType" TEXT;
ALTER TABLE "ReviewMedia" ADD COLUMN IF NOT EXISTS "sizeBytes" INTEGER;
ALTER TABLE "ReviewMedia" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;

UPDATE "ReviewMedia"
SET
  "storageKey" = 'seed/' || id,
  "mimeType" = CASE WHEN "type" = 'video' THEN 'video/mp4' ELSE 'image/jpeg' END,
  "sizeBytes" = 0
WHERE "storageKey" IS NULL;

ALTER TABLE "ReviewMedia" ALTER COLUMN "storageKey" SET NOT NULL;
ALTER TABLE "ReviewMedia" ALTER COLUMN "mimeType" SET NOT NULL;
ALTER TABLE "ReviewMedia" ALTER COLUMN "sizeBytes" SET NOT NULL;

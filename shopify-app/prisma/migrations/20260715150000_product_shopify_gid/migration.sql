-- Baseline migration for a column originally added via `prisma db push`
-- in Phase 4 (2026-07-15) with no migration file. Backdated between the
-- multitenancy and review-media migrations to match the real timeline.
-- The live Neon DB already has this column; this file exists so that a
-- fresh database replaying the migration history reproduces the schema.
ALTER TABLE "Product" ADD COLUMN "shopifyProductId" TEXT;

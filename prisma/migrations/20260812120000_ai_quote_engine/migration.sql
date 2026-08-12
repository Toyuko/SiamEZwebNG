-- AlterEnum QuoteStatus: add new values (PostgreSQL)
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'generated';
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'viewed';
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'converted_to_booking';

-- CreateEnum QuoteType
DO $$ BEGIN
  CREATE TYPE "QuoteType" AS ENUM ('fixed', 'calculated', 'range');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable Quote → support pre-case quotes + pricing breakdown
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "quote_number" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "service_id" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "guest_token" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "quote_type" "QuoteType" NOT NULL DEFAULT 'calculated';
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "requirements" JSONB;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "pricing_breakdown" JSONB;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "subtotal" INTEGER;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "government_fees" INTEGER;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "add_ons_total" INTEGER;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "discount" INTEGER DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "range_min" INTEGER;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "range_max" INTEGER;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "original_amount" INTEGER;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "adjustment_amount" INTEGER;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "adjustment_reason" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "adjusted_by_id" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "adjusted_at" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "admin_notes" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "accepted_at" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "viewed_at" TIMESTAMP(3);

-- Backfill service_id from linked cases before making it required
UPDATE "Quote" q
SET "service_id" = c."service_id"
FROM "Case" c
WHERE q."case_id" = c."id" AND q."service_id" IS NULL;

-- For any orphan quotes without a case, attach to a placeholder only if needed —
-- drop rows that cannot be backfilled (should be none in production soft-launch DBs)
DELETE FROM "Quote" WHERE "service_id" IS NULL;

ALTER TABLE "Quote" ALTER COLUMN "service_id" SET NOT NULL;

-- Make case_id optional (quote may exist before booking)
ALTER TABLE "Quote" ALTER COLUMN "case_id" DROP NOT NULL;

-- Unique / indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Quote_quote_number_key" ON "Quote"("quote_number");
CREATE UNIQUE INDEX IF NOT EXISTS "Quote_guest_token_key" ON "Quote"("guest_token");
CREATE INDEX IF NOT EXISTS "Quote_service_id_idx" ON "Quote"("service_id");
CREATE INDEX IF NOT EXISTS "Quote_status_idx" ON "Quote"("status");
CREATE INDEX IF NOT EXISTS "Quote_user_id_idx" ON "Quote"("user_id");
CREATE INDEX IF NOT EXISTS "Quote_case_id_idx" ON "Quote"("case_id");

-- FKs (idempotent-ish)
DO $$ BEGIN
  ALTER TABLE "Quote" ADD CONSTRAINT "Quote_service_id_fkey"
    FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Quote" ADD CONSTRAINT "Quote_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Quote" ADD CONSTRAINT "Quote_adjusted_by_id_fkey"
    FOREIGN KEY ("adjusted_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Soften case cascade: quotes can outlive case deletion as orphans is undesirable;
-- keep SET NULL via Prisma; existing FK may still be CASCADE — recreate if present
DO $$ BEGIN
  ALTER TABLE "Quote" DROP CONSTRAINT IF EXISTS "Quote_case_id_fkey";
  ALTER TABLE "Quote" ADD CONSTRAINT "Quote_case_id_fkey"
    FOREIGN KEY ("case_id") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN others THEN null;
END $$;

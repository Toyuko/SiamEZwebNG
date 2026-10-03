-- Mobile job intake fields on the existing Case / Invoice models.
-- Additive and nullable so existing bookings keep working.
-- Idempotent: production already had some of these columns before this migration was recorded.

ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'confirmed';

ALTER TABLE "Case" ALTER COLUMN "service_id" DROP NOT NULL;

ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "lead_source" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "lead_source_detail" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMP(3);
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "schedule_time_tbd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "job_description" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "documents_required" JSONB;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "other_service_name" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "intake_idempotency_key" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "created_by_id" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "updated_by_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Case_intake_idempotency_key_key" ON "Case"("intake_idempotency_key");
CREATE INDEX IF NOT EXISTS "Case_scheduled_at_idx" ON "Case"("scheduled_at");
CREATE INDEX IF NOT EXISTS "Case_lead_source_idx" ON "Case"("lead_source");
CREATE INDEX IF NOT EXISTS "Case_status_scheduled_at_idx" ON "Case"("status", "scheduled_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Case_created_by_id_fkey') THEN
    ALTER TABLE "Case" ADD CONSTRAINT "Case_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Case_updated_by_id_fkey') THEN
    ALTER TABLE "Case" ADD CONSTRAINT "Case_updated_by_id_fkey"
      FOREIGN KEY ("updated_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "invoice_number" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_invoice_number_key" ON "invoices"("invoice_number");

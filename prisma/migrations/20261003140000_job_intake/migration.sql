-- Mobile job intake fields on the existing Case / Invoice models.
-- Additive and nullable so existing bookings keep working.

ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'confirmed';

ALTER TABLE "Case" ALTER COLUMN "service_id" DROP NOT NULL;

ALTER TABLE "Case" ADD COLUMN "lead_source" TEXT;
ALTER TABLE "Case" ADD COLUMN "lead_source_detail" TEXT;
ALTER TABLE "Case" ADD COLUMN "scheduled_at" TIMESTAMP(3);
ALTER TABLE "Case" ADD COLUMN "schedule_time_tbd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Case" ADD COLUMN "location" TEXT;
ALTER TABLE "Case" ADD COLUMN "job_description" TEXT;
ALTER TABLE "Case" ADD COLUMN "documents_required" JSONB;
ALTER TABLE "Case" ADD COLUMN "other_service_name" TEXT;
ALTER TABLE "Case" ADD COLUMN "intake_idempotency_key" TEXT;
ALTER TABLE "Case" ADD COLUMN "created_by_id" TEXT;
ALTER TABLE "Case" ADD COLUMN "updated_by_id" TEXT;

CREATE UNIQUE INDEX "Case_intake_idempotency_key_key" ON "Case"("intake_idempotency_key");
CREATE INDEX "Case_scheduled_at_idx" ON "Case"("scheduled_at");
CREATE INDEX "Case_lead_source_idx" ON "Case"("lead_source");
CREATE INDEX "Case_status_scheduled_at_idx" ON "Case"("status", "scheduled_at");

ALTER TABLE "Case" ADD CONSTRAINT "Case_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Case" ADD CONSTRAINT "Case_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD COLUMN "invoice_number" TEXT;
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

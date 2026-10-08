-- Structured province on the job, and one primary calendar event per case.
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "province" TEXT;
CREATE INDEX IF NOT EXISTS "Case_province_scheduled_at_idx" ON "Case"("province", "scheduled_at");

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "primary_for_case_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "events_primary_for_case_id_key" ON "events"("primary_for_case_id");
CREATE INDEX IF NOT EXISTS "events_start_idx" ON "events"("start");
CREATE INDEX IF NOT EXISTS "events_staff_id_start_idx" ON "events"("staff_id", "start");
CREATE INDEX IF NOT EXISTS "events_case_id_idx" ON "events"("case_id");

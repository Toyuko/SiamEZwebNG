-- Location and province on a calendar appointment, matching a job.
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "province" TEXT;
CREATE INDEX IF NOT EXISTS "events_province_start_idx" ON "events"("province", "start");

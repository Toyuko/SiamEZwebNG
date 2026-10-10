-- Job type on a calendar appointment, matching a job's service.
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "service_id" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "other_service_name" TEXT;
CREATE INDEX IF NOT EXISTS "events_service_id_start_idx" ON "events"("service_id", "start");
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_service_id_fkey";
ALTER TABLE "events"
  ADD CONSTRAINT "events_service_id_fkey"
  FOREIGN KEY ("service_id") REFERENCES "Service"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

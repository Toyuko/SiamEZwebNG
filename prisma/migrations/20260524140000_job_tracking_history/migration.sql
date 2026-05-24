-- Append-only tracking history for client timeline

CREATE TABLE "job_tracking_history" (
  "id" TEXT NOT NULL,
  "job_id" TEXT NOT NULL,
  "status" "TrackingStatus" NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "job_tracking_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_tracking_history_job_id_created_at_idx" ON "job_tracking_history"("job_id", "created_at");

ALTER TABLE "job_tracking_history"
  ADD CONSTRAINT "job_tracking_history_job_id_fkey"
  FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

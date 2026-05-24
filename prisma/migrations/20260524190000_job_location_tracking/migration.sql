-- AlterTable
ALTER TABLE "jobs" ADD COLUMN "is_currently_in_transit" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "job_tracking_history" ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;

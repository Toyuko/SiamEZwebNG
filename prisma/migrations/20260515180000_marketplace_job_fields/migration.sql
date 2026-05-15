-- Marketplace job fields + completed_awaiting_review status (idempotent)

DO $$ BEGIN
  CREATE TYPE "AssignmentSource" AS ENUM ('internal', 'freelancer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "service_id" TEXT;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "assignment_source" "AssignmentSource" NOT NULL DEFAULT 'freelancer';
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "payout_amount" INTEGER;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "is_special_member_only" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "enable_auto_approval" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3);

ALTER TABLE "freelancer_profiles" ADD COLUMN IF NOT EXISTS "is_special_member" BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TYPE "JobStatus" ADD VALUE 'completed_awaiting_review';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "jobs_assignment_source_status_idx" ON "jobs"("assignment_source", "status");

DO $$ BEGIN
  ALTER TABLE "jobs" ADD CONSTRAINT "jobs_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

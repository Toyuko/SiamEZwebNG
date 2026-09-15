-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "AccountDeletionRequestStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "AccountDeletionRequestSource" AS ENUM ('PUBLIC', 'AUTHENTICATED', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "account_deletion_requests" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "user_id" TEXT,
    "status" "AccountDeletionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "source" "AccountDeletionRequestSource" NOT NULL DEFAULT 'PUBLIC',
    "locale" TEXT,
    "ip_hash" TEXT,
    "admin_notes" TEXT,
    "processed_by_id" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processing_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "account_deletion_audit_logs" (
    "id" TEXT NOT NULL,
    "request_id" TEXT,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "actor_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_deletion_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "account_deletion_requests_email_status_idx" ON "account_deletion_requests"("email", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "account_deletion_requests_status_requested_at_idx" ON "account_deletion_requests"("status", "requested_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "account_deletion_requests_user_id_idx" ON "account_deletion_requests"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "account_deletion_audit_logs_request_id_created_at_idx" ON "account_deletion_audit_logs"("request_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "account_deletion_audit_logs_actor_id_created_at_idx" ON "account_deletion_audit_logs"("actor_id", "created_at");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_processed_by_id_fkey" FOREIGN KEY ("processed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "account_deletion_audit_logs" ADD CONSTRAINT "account_deletion_audit_logs_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "account_deletion_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "account_deletion_audit_logs" ADD CONSTRAINT "account_deletion_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

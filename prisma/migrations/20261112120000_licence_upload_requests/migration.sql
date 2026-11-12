-- CreateEnum
CREATE TYPE "LicenceUploadRequestStatus" AS ENUM ('ACTIVE', 'OPENED', 'SUBMITTED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "licence_upload_requests" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "sales_rep_id" TEXT,
    "customer_user_id" TEXT,
    "customer_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "service_kind" "LicenceServiceKind" NOT NULL,
    "renewal_vehicle" TEXT,
    "message" TEXT,
    "checklist" JSONB NOT NULL,
    "token" TEXT NOT NULL,
    "status" "LicenceUploadRequestStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licence_upload_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licence_upload_events" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "event" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "licence_upload_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "licence_upload_requests_token_key" ON "licence_upload_requests"("token");
CREATE INDEX "licence_upload_requests_application_id_created_at_idx" ON "licence_upload_requests"("application_id", "created_at");
CREATE INDEX "licence_upload_requests_conversation_id_created_at_idx" ON "licence_upload_requests"("conversation_id", "created_at");
CREATE INDEX "licence_upload_requests_sales_rep_id_created_at_idx" ON "licence_upload_requests"("sales_rep_id", "created_at");
CREATE INDEX "licence_upload_requests_status_created_at_idx" ON "licence_upload_requests"("status", "created_at");
CREATE INDEX "licence_upload_events_request_id_created_at_idx" ON "licence_upload_events"("request_id", "created_at");
CREATE INDEX "licence_upload_events_application_id_created_at_idx" ON "licence_upload_events"("application_id", "created_at");

-- AddForeignKey
ALTER TABLE "licence_upload_requests" ADD CONSTRAINT "licence_upload_requests_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "licence_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "licence_upload_requests" ADD CONSTRAINT "licence_upload_requests_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "backoffice_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "licence_upload_requests" ADD CONSTRAINT "licence_upload_requests_sales_rep_id_fkey" FOREIGN KEY ("sales_rep_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "licence_upload_requests" ADD CONSTRAINT "licence_upload_requests_customer_user_id_fkey" FOREIGN KEY ("customer_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "licence_upload_events" ADD CONSTRAINT "licence_upload_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "licence_upload_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "licence_upload_events" ADD CONSTRAINT "licence_upload_events_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "licence_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "licence_upload_events" ADD CONSTRAINT "licence_upload_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

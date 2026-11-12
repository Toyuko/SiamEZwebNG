-- CreateEnum
CREATE TYPE "LicenceServiceKind" AS ENUM ('NEW_CAR', 'NEW_MOTORCYCLE', 'NEW_BOTH', 'CONVERSION_CAR', 'CONVERSION_MOTORCYCLE', 'CONVERSION_BOTH', 'RENEWAL', 'LOST_REPLACEMENT', 'IDP');

-- CreateEnum
CREATE TYPE "LicenceApplicationStatus" AS ENUM ('DRAFT', 'AWAITING_DOCUMENTS', 'AI_IN_PROGRESS', 'READY_FOR_STAFF_REVIEW', 'CORRECTIONS_REQUIRED', 'MANUAL_REVIEW', 'APPROVED_FOR_QUOTATION', 'QUOTATION_SENT', 'BOOKING_CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LicenceAssessmentOutcome" AS ENUM ('PASS', 'ACTION_REQUIRED', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "LicenceRequirementLevel" AS ENUM ('REQUIRED', 'OPTIONAL');

-- CreateEnum
CREATE TYPE "LicenceApprovalDecision" AS ENUM ('APPROVED', 'REJECTED', 'OVERRIDE', 'ASSESSMENT_OVERRIDE');

-- CreateEnum
CREATE TYPE "LicenceNotificationStatus" AS ENUM ('SENT', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "licence_applications" (
    "id" TEXT NOT NULL,
    "reference_number" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "user_id" TEXT,
    "service_id" TEXT,
    "case_id" TEXT,
    "quote_id" TEXT,
    "invoice_id" TEXT,
    "assigned_staff_id" TEXT,
    "service_kind" "LicenceServiceKind" NOT NULL,
    "status" "LicenceApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licence_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licence_applicant_details" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "full_legal_name" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "passport_number" TEXT NOT NULL,
    "country_of_residence" TEXT NOT NULL,
    "immigration_status" TEXT NOT NULL,
    "visa_expiry_date" DATE,
    "thai_address" TEXT NOT NULL,
    "has_residence_certificate" BOOLEAN NOT NULL,
    "has_work_permit" BOOLEAN NOT NULL,
    "has_foreign_licence" BOOLEAN NOT NULL,
    "foreign_licence_country" TEXT,
    "foreign_licence_categories" TEXT,
    "foreign_licence_issue_date" DATE,
    "foreign_licence_expiry_date" DATE,
    "foreign_licence_format" TEXT,
    "foreign_licence_language" TEXT,
    "previously_held_thai_licence" BOOLEAN NOT NULL,
    "failed_or_attempted_before" BOOLEAN NOT NULL,
    "attempt_notes" TEXT,
    "renewal_vehicle" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licence_applicant_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licence_documents" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaded_by_id" TEXT,
    "replaces_document_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "licence_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licence_requirements" (
    "id" TEXT NOT NULL,
    "rule_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "service_kinds" TEXT[],
    "customer_categories" TEXT[],
    "level" "LicenceRequirementLevel" NOT NULL DEFAULT 'REQUIRED',
    "source" TEXT NOT NULL,
    "last_verified_on" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "evaluator_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licence_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licence_assessment_results" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "outcome" "LicenceAssessmentOutcome" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "summary" TEXT NOT NULL,
    "next_steps" TEXT NOT NULL,
    "model" TEXT,
    "ai_available" BOOLEAN NOT NULL,
    "ai_error" TEXT,
    "disclaimer" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "licence_assessment_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licence_assessment_findings" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "document_id" TEXT,
    "document_type" TEXT,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "recommended_action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "licence_assessment_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licence_document_extractions" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "assessment_id" TEXT,
    "detected_type" TEXT,
    "holder_name" TEXT,
    "document_number" TEXT,
    "issue_date" TEXT,
    "expiry_date" TEXT,
    "categories" JSONB,
    "issuing_country" TEXT,
    "readable" BOOLEAN NOT NULL DEFAULT false,
    "complete" BOOLEAN NOT NULL DEFAULT false,
    "possible_alteration" BOOLEAN NOT NULL DEFAULT false,
    "translation_likely_needed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "corrected" BOOLEAN NOT NULL DEFAULT false,
    "raw" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "licence_document_extractions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licence_application_history" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "event" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT,
    "detail" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "licence_application_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licence_staff_assignments" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "assigned_by_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "licence_staff_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licence_internal_notes" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "author_id" TEXT,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "licence_internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licence_customer_notifications" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "template_key" TEXT NOT NULL,
    "to_address" TEXT,
    "subject" TEXT NOT NULL,
    "body_summary" TEXT NOT NULL,
    "status" "LicenceNotificationStatus" NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "licence_customer_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licence_approval_records" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "staff_id" TEXT,
    "decision" "LicenceApprovalDecision" NOT NULL,
    "reason" TEXT NOT NULL,
    "previous_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "licence_approval_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "licence_applications_reference_number_key" ON "licence_applications"("reference_number");
CREATE UNIQUE INDEX "licence_applications_access_token_key" ON "licence_applications"("access_token");
CREATE UNIQUE INDEX "licence_applications_case_id_key" ON "licence_applications"("case_id");
CREATE UNIQUE INDEX "licence_applications_quote_id_key" ON "licence_applications"("quote_id");
CREATE UNIQUE INDEX "licence_applications_invoice_id_key" ON "licence_applications"("invoice_id");
CREATE INDEX "licence_applications_status_created_at_idx" ON "licence_applications"("status", "created_at");
CREATE INDEX "licence_applications_service_kind_idx" ON "licence_applications"("service_kind");
CREATE INDEX "licence_applications_email_idx" ON "licence_applications"("email");
CREATE INDEX "licence_applications_assigned_staff_id_idx" ON "licence_applications"("assigned_staff_id");

CREATE UNIQUE INDEX "licence_applicant_details_application_id_key" ON "licence_applicant_details"("application_id");
CREATE INDEX "licence_applicant_details_nationality_idx" ON "licence_applicant_details"("nationality");

CREATE INDEX "licence_documents_application_id_active_idx" ON "licence_documents"("application_id", "active");
CREATE INDEX "licence_documents_document_type_idx" ON "licence_documents"("document_type");

CREATE UNIQUE INDEX "licence_requirements_rule_key_key" ON "licence_requirements"("rule_key");
CREATE INDEX "licence_requirements_active_idx" ON "licence_requirements"("active");

CREATE INDEX "licence_assessment_results_application_id_created_at_idx" ON "licence_assessment_results"("application_id", "created_at");
CREATE INDEX "licence_assessment_findings_assessment_id_idx" ON "licence_assessment_findings"("assessment_id");
CREATE INDEX "licence_document_extractions_document_id_idx" ON "licence_document_extractions"("document_id");
CREATE INDEX "licence_document_extractions_assessment_id_idx" ON "licence_document_extractions"("assessment_id");
CREATE INDEX "licence_application_history_application_id_created_at_idx" ON "licence_application_history"("application_id", "created_at");
CREATE INDEX "licence_staff_assignments_application_id_active_idx" ON "licence_staff_assignments"("application_id", "active");
CREATE INDEX "licence_staff_assignments_staff_id_idx" ON "licence_staff_assignments"("staff_id");
CREATE INDEX "licence_internal_notes_application_id_created_at_idx" ON "licence_internal_notes"("application_id", "created_at");
CREATE INDEX "licence_customer_notifications_application_id_created_at_idx" ON "licence_customer_notifications"("application_id", "created_at");
CREATE INDEX "licence_approval_records_application_id_created_at_idx" ON "licence_approval_records"("application_id", "created_at");

-- AddForeignKey
ALTER TABLE "licence_applications" ADD CONSTRAINT "licence_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "licence_applications" ADD CONSTRAINT "licence_applications_assigned_staff_id_fkey" FOREIGN KEY ("assigned_staff_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "licence_applications" ADD CONSTRAINT "licence_applications_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "licence_applications" ADD CONSTRAINT "licence_applications_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "licence_applications" ADD CONSTRAINT "licence_applications_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "licence_applications" ADD CONSTRAINT "licence_applications_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "licence_applicant_details" ADD CONSTRAINT "licence_applicant_details_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "licence_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "licence_documents" ADD CONSTRAINT "licence_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "licence_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "licence_documents" ADD CONSTRAINT "licence_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "licence_assessment_results" ADD CONSTRAINT "licence_assessment_results_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "licence_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "licence_assessment_findings" ADD CONSTRAINT "licence_assessment_findings_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "licence_assessment_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "licence_document_extractions" ADD CONSTRAINT "licence_document_extractions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "licence_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "licence_document_extractions" ADD CONSTRAINT "licence_document_extractions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "licence_assessment_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "licence_application_history" ADD CONSTRAINT "licence_application_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "licence_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "licence_application_history" ADD CONSTRAINT "licence_application_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "licence_staff_assignments" ADD CONSTRAINT "licence_staff_assignments_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "licence_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "licence_staff_assignments" ADD CONSTRAINT "licence_staff_assignments_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "licence_staff_assignments" ADD CONSTRAINT "licence_staff_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "licence_internal_notes" ADD CONSTRAINT "licence_internal_notes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "licence_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "licence_internal_notes" ADD CONSTRAINT "licence_internal_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "licence_customer_notifications" ADD CONSTRAINT "licence_customer_notifications_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "licence_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "licence_approval_records" ADD CONSTRAINT "licence_approval_records_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "licence_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "licence_approval_records" ADD CONSTRAINT "licence_approval_records_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

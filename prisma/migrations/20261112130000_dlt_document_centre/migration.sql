-- DLT document packages, offices, appointments, and visit results.

CREATE TYPE "LicencePackageStatus" AS ENUM ('BLOCKED', 'READY_TO_PRINT', 'PRINTED');
CREATE TYPE "DltAppointmentStatus" AS ENUM ('NOT_BOOKED', 'BOOKING_IN_PROGRESS', 'AWAITING_CONFIRMATION', 'CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');
CREATE TYPE "DltVisitOutcomeKind" AS ENUM ('SUCCESSFULLY_COMPLETED', 'LICENCE_ISSUED', 'ADDITIONAL_DOCUMENTS', 'ANOTHER_APPOINTMENT', 'FAILED_EXAMINATION', 'REJECTED', 'POSTPONED');

CREATE TABLE "dlt_offices" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_th" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "supported_service_kinds" TEXT[],
    "opening_hours" TEXT NOT NULL DEFAULT '',
    "booking_instructions" TEXT NOT NULL DEFAULT '',
    "special_requirements" TEXT NOT NULL DEFAULT '',
    "booking_url" TEXT NOT NULL DEFAULT 'https://gecc.dlt.go.th/webBooking/',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "dlt_offices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "licence_document_packages" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "LicencePackageStatus" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "issues" JSONB NOT NULL,
    "override_reason" TEXT,
    "generated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "licence_document_packages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "licence_package_prints" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "document_id" TEXT,
    "printed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "licence_package_prints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dlt_appointments" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "office_id" TEXT,
    "appointment_date" TEXT,
    "appointment_time" TEXT,
    "confirmation_number" TEXT,
    "booking_method" TEXT NOT NULL DEFAULT 'smart_queue_web',
    "status" "DltAppointmentStatus" NOT NULL DEFAULT 'NOT_BOOKED',
    "special_instructions" TEXT NOT NULL DEFAULT '',
    "assigned_staff_id" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "reminder_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "dlt_appointments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "licence_visit_results" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "outcome" "DltVisitOutcomeKind" NOT NULL,
    "feedback" TEXT NOT NULL DEFAULT '',
    "additional_requirements" TEXT NOT NULL DEFAULT '',
    "next_appointment_date" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "recorded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "licence_visit_results_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "licence_screening_lessons" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "service_kind" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "user_id" TEXT,
    "outcome" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "licence_screening_lessons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "licence_finding_acknowledgements" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "finding_key" TEXT NOT NULL,
    "staff_id" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "licence_finding_acknowledgements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dlt_offices_slug_key" ON "dlt_offices"("slug");
CREATE INDEX "dlt_offices_province_active_idx" ON "dlt_offices"("province", "active");
CREATE UNIQUE INDEX "licence_document_packages_application_id_version_key" ON "licence_document_packages"("application_id", "version");
CREATE INDEX "licence_document_packages_application_id_created_at_idx" ON "licence_document_packages"("application_id", "created_at");
CREATE INDEX "licence_document_packages_status_idx" ON "licence_document_packages"("status");
CREATE INDEX "licence_package_prints_package_id_created_at_idx" ON "licence_package_prints"("package_id", "created_at");
CREATE INDEX "dlt_appointments_application_id_created_at_idx" ON "dlt_appointments"("application_id", "created_at");
CREATE INDEX "dlt_appointments_appointment_date_status_idx" ON "dlt_appointments"("appointment_date", "status");
CREATE INDEX "dlt_appointments_assigned_staff_id_idx" ON "dlt_appointments"("assigned_staff_id");
CREATE INDEX "licence_visit_results_application_id_created_at_idx" ON "licence_visit_results"("application_id", "created_at");
CREATE INDEX "licence_visit_results_outcome_idx" ON "licence_visit_results"("outcome");
CREATE INDEX "licence_screening_lessons_service_kind_created_at_idx" ON "licence_screening_lessons"("service_kind", "created_at");
CREATE INDEX "licence_screening_lessons_email_idx" ON "licence_screening_lessons"("email");
CREATE UNIQUE INDEX "licence_finding_acknowledgements_application_id_finding_key_key" ON "licence_finding_acknowledgements"("application_id", "finding_key");
CREATE INDEX "licence_finding_acknowledgements_application_id_idx" ON "licence_finding_acknowledgements"("application_id");

ALTER TABLE "licence_document_packages" ADD CONSTRAINT "licence_document_packages_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "licence_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "licence_document_packages" ADD CONSTRAINT "licence_document_packages_generated_by_id_fkey" FOREIGN KEY ("generated_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "licence_package_prints" ADD CONSTRAINT "licence_package_prints_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "licence_document_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "licence_package_prints" ADD CONSTRAINT "licence_package_prints_printed_by_id_fkey" FOREIGN KEY ("printed_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dlt_appointments" ADD CONSTRAINT "dlt_appointments_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "licence_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dlt_appointments" ADD CONSTRAINT "dlt_appointments_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "dlt_offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dlt_appointments" ADD CONSTRAINT "dlt_appointments_assigned_staff_id_fkey" FOREIGN KEY ("assigned_staff_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "licence_visit_results" ADD CONSTRAINT "licence_visit_results_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "licence_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "licence_visit_results" ADD CONSTRAINT "licence_visit_results_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "dlt_appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "licence_visit_results" ADD CONSTRAINT "licence_visit_results_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "licence_screening_lessons" ADD CONSTRAINT "licence_screening_lessons_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "licence_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "licence_finding_acknowledgements" ADD CONSTRAINT "licence_finding_acknowledgements_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "licence_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "licence_finding_acknowledgements" ADD CONSTRAINT "licence_finding_acknowledgements_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

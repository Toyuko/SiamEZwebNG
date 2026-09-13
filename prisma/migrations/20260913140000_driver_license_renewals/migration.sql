-- CreateEnum
CREATE TYPE "DriverLicenseRenewalType" AS ENUM ('DRIVER_LICENSE_2_TO_5', 'DRIVER_LICENSE_5_TO_5');

-- CreateEnum
CREATE TYPE "DriverLicenseFollowUpStatus" AS ENUM ('UPCOMING', 'REMINDER_DUE', 'REMINDER_SENT', 'CONTACTED', 'RENEWED', 'CANCELLED', 'NOT_INTERESTED');

-- CreateEnum
CREATE TYPE "DriverLicenseReminderSendMethod" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "DriverLicenseActivityType" AS ENUM ('CREATED', 'UPDATED', 'REMINDER_SENT', 'REMINDER_FAILED', 'REMINDER_TEST', 'STATUS_CHANGED', 'CONTACTED', 'RENEWED', 'RESCHEDULED', 'CANCELLED', 'NOT_INTERESTED', 'NOTE_ADDED');

-- CreateTable
CREATE TABLE "driver_license_renewals" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "case_id" TEXT,
    "assigned_staff_id" TEXT,
    "previous_license_type" TEXT,
    "renewal_type" "DriverLicenseRenewalType" NOT NULL,
    "issue_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "next_renewal_date" DATE NOT NULL,
    "reminder_date" DATE NOT NULL,
    "reminder_sent_at" TIMESTAMP(3),
    "reminder_sent_by_id" TEXT,
    "reminder_send_method" "DriverLicenseReminderSendMethod",
    "status" "DriverLicenseFollowUpStatus" NOT NULL DEFAULT 'UPCOMING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_license_renewals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_license_renewal_activities" (
    "id" TEXT NOT NULL,
    "renewal_id" TEXT NOT NULL,
    "type" "DriverLicenseActivityType" NOT NULL,
    "from_status" "DriverLicenseFollowUpStatus",
    "to_status" "DriverLicenseFollowUpStatus",
    "send_method" "DriverLicenseReminderSendMethod",
    "note" TEXT,
    "actor_id" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_license_renewal_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "driver_license_renewals_status_reminder_date_idx" ON "driver_license_renewals"("status", "reminder_date");

-- CreateIndex
CREATE INDEX "driver_license_renewals_status_next_renewal_date_idx" ON "driver_license_renewals"("status", "next_renewal_date");

-- CreateIndex
CREATE INDEX "driver_license_renewals_client_id_created_at_idx" ON "driver_license_renewals"("client_id", "created_at");

-- CreateIndex
CREATE INDEX "driver_license_renewals_reminder_date_idx" ON "driver_license_renewals"("reminder_date");

-- CreateIndex
CREATE INDEX "driver_license_renewals_next_renewal_date_idx" ON "driver_license_renewals"("next_renewal_date");

-- CreateIndex
CREATE INDEX "driver_license_renewals_case_id_idx" ON "driver_license_renewals"("case_id");

-- CreateIndex
CREATE INDEX "driver_license_renewal_activities_renewal_id_created_at_idx" ON "driver_license_renewal_activities"("renewal_id", "created_at");

-- AddForeignKey
ALTER TABLE "driver_license_renewals" ADD CONSTRAINT "driver_license_renewals_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_license_renewals" ADD CONSTRAINT "driver_license_renewals_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_license_renewals" ADD CONSTRAINT "driver_license_renewals_assigned_staff_id_fkey" FOREIGN KEY ("assigned_staff_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_license_renewals" ADD CONSTRAINT "driver_license_renewals_reminder_sent_by_id_fkey" FOREIGN KEY ("reminder_sent_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_license_renewal_activities" ADD CONSTRAINT "driver_license_renewal_activities_renewal_id_fkey" FOREIGN KEY ("renewal_id") REFERENCES "driver_license_renewals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_license_renewal_activities" ADD CONSTRAINT "driver_license_renewal_activities_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

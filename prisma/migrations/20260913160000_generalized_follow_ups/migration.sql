-- Generalized Client Follow-Up System

CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'DUE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'SNOOZED');
CREATE TYPE "FollowUpPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "FollowUpType" AS ENUM ('CUSTOM', 'CLIENT_CONTACT', 'DOCUMENT_REQUEST', 'PAYMENT', 'SERVICE_COMPLETION', 'RENEWAL', 'REVIEW', 'CHECK_IN', 'SALES', 'QUOTE', 'APPOINTMENT', 'OTHER');
CREATE TYPE "FollowUpReminderStatus" AS ENUM ('NONE', 'SCHEDULED', 'SENT', 'FAILED', 'SKIPPED');
CREATE TYPE "FollowUpReminderSendMethod" AS ENUM ('AUTOMATIC', 'MANUAL');
CREATE TYPE "FollowUpActivityType" AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'ASSIGNED', 'SNOOZED', 'COMPLETED', 'CANCELLED', 'NOTE_ADDED', 'EMAIL_SENT', 'EMAIL_FAILED', 'EMAIL_SKIPPED', 'REMINDER_SCHEDULED', 'TEMPLATE_APPLIED');
CREATE TYPE "RelativeDateUnit" AS ENUM ('DAYS', 'WEEKS', 'MONTHS');
CREATE TYPE "RelativeDateDirection" AS ENUM ('BEFORE', 'AFTER');
CREATE TYPE "FollowUpTemplateTrigger" AS ENUM ('MANUAL', 'CASE_COMPLETED', 'QUOTE_SENT', 'SERVICE_COMPLETED', 'CUSTOM_DATE', 'EXPIRY_DATE');

CREATE TABLE "follow_up_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "service_id" TEXT,
    "service_slug" TEXT,
    "follow_up_type" "FollowUpType" NOT NULL DEFAULT 'CUSTOM',
    "priority" "FollowUpPriority" NOT NULL DEFAULT 'NORMAL',
    "delay_value" INTEGER NOT NULL DEFAULT 7,
    "delay_unit" "RelativeDateUnit" NOT NULL DEFAULT 'DAYS',
    "delay_direction" "RelativeDateDirection" NOT NULL DEFAULT 'AFTER',
    "trigger_event" "FollowUpTemplateTrigger" NOT NULL DEFAULT 'MANUAL',
    "reminder_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reminder_offset_value" INTEGER NOT NULL DEFAULT 0,
    "reminder_offset_unit" "RelativeDateUnit" NOT NULL DEFAULT 'DAYS',
    "reminder_offset_direction" "RelativeDateDirection" NOT NULL DEFAULT 'BEFORE',
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_subject" TEXT,
    "email_body" TEXT,
    "default_assignee_id" TEXT,
    "auto_apply" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_up_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "follow_ups" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "case_id" TEXT,
    "service_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "follow_up_type" "FollowUpType" NOT NULL DEFAULT 'CUSTOM',
    "due_date" DATE NOT NULL,
    "due_time" TEXT,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "FollowUpPriority" NOT NULL DEFAULT 'NORMAL',
    "assigned_staff_id" TEXT,
    "email_reminder_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_reminder_date" DATE,
    "email_subject" TEXT,
    "email_body" TEXT,
    "reminder_sent_at" TIMESTAMP(3),
    "reminder_status" "FollowUpReminderStatus" NOT NULL DEFAULT 'NONE',
    "reminder_send_method" "FollowUpReminderSendMethod",
    "completed_at" TIMESTAMP(3),
    "completed_by_id" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT,
    "template_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "follow_up_activities" (
    "id" TEXT NOT NULL,
    "follow_up_id" TEXT NOT NULL,
    "type" "FollowUpActivityType" NOT NULL,
    "from_status" "FollowUpStatus",
    "to_status" "FollowUpStatus",
    "send_method" "FollowUpReminderSendMethod",
    "note" TEXT,
    "actor_id" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_up_activities_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "driver_license_renewals" ADD COLUMN "follow_up_id" TEXT;

CREATE UNIQUE INDEX "driver_license_renewals_follow_up_id_key" ON "driver_license_renewals"("follow_up_id");

CREATE INDEX "follow_up_templates_service_id_active_idx" ON "follow_up_templates"("service_id", "active");
CREATE INDEX "follow_up_templates_service_slug_active_idx" ON "follow_up_templates"("service_slug", "active");
CREATE INDEX "follow_up_templates_trigger_event_auto_apply_active_idx" ON "follow_up_templates"("trigger_event", "auto_apply", "active");

CREATE INDEX "follow_ups_status_due_date_idx" ON "follow_ups"("status", "due_date");
CREATE INDEX "follow_ups_status_email_reminder_date_idx" ON "follow_ups"("status", "email_reminder_date");
CREATE INDEX "follow_ups_client_id_status_due_date_idx" ON "follow_ups"("client_id", "status", "due_date");
CREATE INDEX "follow_ups_assigned_staff_id_status_due_date_idx" ON "follow_ups"("assigned_staff_id", "status", "due_date");
CREATE INDEX "follow_ups_service_id_status_idx" ON "follow_ups"("service_id", "status");
CREATE INDEX "follow_ups_follow_up_type_status_idx" ON "follow_ups"("follow_up_type", "status");
CREATE INDEX "follow_ups_case_id_idx" ON "follow_ups"("case_id");
CREATE INDEX "follow_ups_due_date_idx" ON "follow_ups"("due_date");
CREATE INDEX "follow_ups_email_reminder_date_idx" ON "follow_ups"("email_reminder_date");

CREATE INDEX "follow_up_activities_follow_up_id_created_at_idx" ON "follow_up_activities"("follow_up_id", "created_at");

ALTER TABLE "follow_up_templates" ADD CONSTRAINT "follow_up_templates_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "follow_up_templates" ADD CONSTRAINT "follow_up_templates_default_assignee_id_fkey" FOREIGN KEY ("default_assignee_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "follow_up_templates" ADD CONSTRAINT "follow_up_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_assigned_staff_id_fkey" FOREIGN KEY ("assigned_staff_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "follow_up_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "follow_up_activities" ADD CONSTRAINT "follow_up_activities_follow_up_id_fkey" FOREIGN KEY ("follow_up_id") REFERENCES "follow_ups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follow_up_activities" ADD CONSTRAINT "follow_up_activities_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "driver_license_renewals" ADD CONSTRAINT "driver_license_renewals_follow_up_id_fkey" FOREIGN KEY ("follow_up_id") REFERENCES "follow_ups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

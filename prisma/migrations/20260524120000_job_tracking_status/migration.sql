-- Track & Trace step status for driver-license and vehicle-registration jobs

CREATE TYPE "TrackingStatus" AS ENUM (
  'DOCUMENTS_PENDING',
  'APPOINTMENT_SET',
  'DLT_EXAM_PREP',
  'LICENSE_ISSUED',
  'POR_ROR_BOR_PAID',
  'DLT_INSPECTION',
  'PLATES_ISSUED',
  'DELIVERED'
);

ALTER TABLE "jobs" ADD COLUMN "tracking_status" "TrackingStatus";
ALTER TABLE "jobs" ADD COLUMN "tracking_notes" TEXT;

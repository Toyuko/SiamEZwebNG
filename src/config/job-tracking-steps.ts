import type { TrackingStatus } from "@prisma/client";
import type { ServiceSlug } from "@/config/services";

export type TrackingStepKey = TrackingStatus;

export type TrackingStep = {
  key: TrackingStepKey;
  th: string;
  en: string;
};

/** Driver's License — mirrors Drivers-License-System STATUS_STEPS flow, adapted for marketplace jobs. */
export const DRIVER_LICENSE_TRACKING_STEPS: TrackingStep[] = [
  { key: "DOCUMENTS_PENDING", th: "รอเอกสาร", en: "Documents Pending" },
  { key: "APPOINTMENT_SET", th: "นัดหมายแล้ว", en: "Appointment Set" },
  {
    key: "DLT_EXAM_PREP",
    th: "เตรียมสอบ / ดำเนินการที่กรมขนส่ง",
    en: "DLT Exam & Processing",
  },
  { key: "LICENSE_ISSUED", th: "ออกใบขับขี่แล้ว", en: "License Issued" },
  { key: "DELIVERED", th: "จัดส่งแล้ว / เสร็จสิ้น", en: "Delivered" },
];

/** Vehicle Registration — Bangkok registration workflow steps. */
export const VEHICLE_REGISTRATION_TRACKING_STEPS: TrackingStep[] = [
  { key: "DOCUMENTS_PENDING", th: "รอเอกสาร", en: "Documents Pending" },
  { key: "POR_ROR_BOR_PAID", th: "ชำระ ป.ร./ร./บ. แล้ว", en: "Por Ror Bor Paid" },
  { key: "DLT_INSPECTION", th: "ตรวจสภาพที่กรมขนส่ง", en: "DLT Inspection" },
  { key: "PLATES_ISSUED", th: "ออกป้ายทะเบียนแล้ว", en: "Plates Issued" },
  { key: "DELIVERED", th: "จัดส่งแล้ว / เสร็จสิ้น", en: "Delivered" },
];

const TRACKING_STEPS_BY_SLUG: Partial<Record<ServiceSlug, TrackingStep[]>> = {
  "driver-license": DRIVER_LICENSE_TRACKING_STEPS,
  "vehicle-registration": VEHICLE_REGISTRATION_TRACKING_STEPS,
};

export const TRACKABLE_SERVICE_SLUGS = Object.keys(
  TRACKING_STEPS_BY_SLUG
) as ServiceSlug[];

export function isTrackableServiceSlug(
  slug: string | null | undefined
): slug is ServiceSlug {
  return slug != null && slug in TRACKING_STEPS_BY_SLUG;
}

export function getTrackingStepsForServiceSlug(
  slug: string | null | undefined
): TrackingStep[] | null {
  if (!isTrackableServiceSlug(slug)) return null;
  return TRACKING_STEPS_BY_SLUG[slug] ?? null;
}

export function getDefaultTrackingStatus(
  slug: string | null | undefined
): TrackingStatus | null {
  const steps = getTrackingStepsForServiceSlug(slug);
  return steps?.[0]?.key ?? null;
}

export function getTrackingStepIndex(
  steps: TrackingStep[],
  status: TrackingStatus | null | undefined
): number {
  if (!status) return -1;
  return steps.findIndex((s) => s.key === status);
}

export function trackingProgressPercent(
  steps: TrackingStep[],
  status: TrackingStatus | null | undefined
): number {
  const index = getTrackingStepIndex(steps, status);
  if (index < 0 || steps.length <= 1) return 0;
  return Math.round((index / (steps.length - 1)) * 100);
}

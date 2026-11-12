export const OFFICIAL_DLT_BOOKING_URL = "https://gecc.dlt.go.th/webBooking/";

export const DLT_APPOINTMENT_STATUSES = [
  "NOT_BOOKED",
  "BOOKING_IN_PROGRESS",
  "AWAITING_CONFIRMATION",
  "CONFIRMED",
  "RESCHEDULED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
] as const;

export type DltAppointmentStatusName = (typeof DLT_APPOINTMENT_STATUSES)[number];

export const BOOKING_METHODS = [
  ["smart_queue_web", "DLT Smart Queue website"],
  ["smart_queue_app", "DLT Smart Queue app"],
  ["phone", "Phone"],
  ["in_person", "In person at the office"],
] as const;

const NEEDS_CONFIRMATION = new Set(["CONFIRMED", "RESCHEDULED"]);

export function appointmentUpdateError(input: {
  status: string;
  confirmationNumber: string;
  officeActive: boolean;
  officeSupportsService: boolean;
  officeConfigured: boolean;
  appointmentDate: string;
}): string | null {
  if (!DLT_APPOINTMENT_STATUSES.includes(input.status as DltAppointmentStatusName)) {
    return "Choose an appointment status from the list.";
  }
  if (!input.officeConfigured) {
    return "Select a DLT office before saving the appointment.";
  }
  if (!input.officeActive) {
    return "That DLT office is inactive. Choose an active office.";
  }
  if (!input.officeSupportsService) {
    return "This office is not configured for the customer's licence category. Choose another office or update the office's supported services.";
  }
  if (NEEDS_CONFIRMATION.has(input.status)) {
    if (input.confirmationNumber.trim().length < 4) {
      return "Enter the confirmation number from DLT Smart Queue before marking the appointment confirmed.";
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.appointmentDate)) {
      return "Enter the appointment date from the DLT confirmation.";
    }
  }
  return null;
}

export function addCalendarDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

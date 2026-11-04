import { addCalendarDays, todayInBangkok, type DateParts } from "@/lib/follow-ups/dates";
import { dateKeyFromParts } from "@/lib/backoffice/format";

export function parseAssigneeName(text: string): string | null {
  const match = text.match(/\b(?:for|assign(?:ed)? to)\s+([A-Za-z][A-Za-z.'-]{1,40})/i);
  if (!match?.[1]) return null;
  if (/^(this|the|a|an|me|tomorrow|today|customer|everyone)$/i.test(match[1])) return null;
  return match[1];
}

export function parseDueDateKey(text: string, today: DateParts = todayInBangkok()): string {
  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];
  if (iso) return iso;
  if (/\btoday\b/i.test(text)) return dateKeyFromParts(today);
  return dateKeyFromParts(addCalendarDays(today, 1));
}

export function parseCustomerDraft(text: string): {
  email: string | null;
  name: string | null;
  phone: string | null;
} {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? null;
  const phone = text.match(/(?:\+?\d[\d\s-]{7,}\d)/)?.[0]?.replace(/[^\d+]/g, "") ?? null;
  const named = text.match(/\bnamed\s+([A-Za-z][A-Za-z .'-]{1,60})/i)?.[1]?.trim() ?? null;
  return { email, name: named, phone };
}

export type ReminderBooking = {
  caseId: string;
  caseNumber: string;
  email: string;
  name: string;
  whenLabel: string;
  service: string;
};

export function buildReminderPlan(bookings: ReminderBooking[]): {
  subject: string;
  bookings: ReminderBooking[];
  summary: string;
} {
  const capped = bookings.filter((booking) => booking.email.includes("@")).slice(0, 50);
  const when = capped[0]?.whenLabel ?? "the appointment";
  return {
    subject: `SiamEZ appointment reminder — ${when}`,
    bookings: capped,
    summary: `Send ${capped.length} appointment reminder${capped.length === 1 ? "" : "s"}. Nothing is sent until you confirm.`,
  };
}

export function reminderBody(booking: ReminderBooking): string {
  return [
    `Hello ${booking.name},`,
    "",
    `This is a reminder from SiamEZ about your appointment on ${booking.whenLabel} (${booking.service}).`,
    "",
    "If you need to change the time, reply to this email or contact us on LINE.",
    "",
    "SiamEZ",
  ].join("\n");
}

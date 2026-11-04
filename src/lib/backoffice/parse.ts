import { addCalendarDays, todayInBangkok, type DateParts } from "@/lib/follow-ups/dates";
import { dateKeyFromParts, formatSatang } from "@/lib/backoffice/format";

export function parseAssigneeName(text: string): string | null {
  const remind = text.match(/\bremind\s+([A-Za-z][A-Za-z.'-]{1,40})\b/i);
  const match = text.match(/\bassign(?:ed)?(?:\s+\w+){0,4}\s+to\s+([A-Za-z][A-Za-z.'-]{1,40})/i);
  const named = text.match(/\bfor\s+([A-Za-z][A-Za-z.'-]{1,40})/i);
  const tail = text.match(/\bto\s+([A-Za-z][A-Za-z.'-]{1,40})\s*\.?\s*$/i);
  const raw = (remind?.[1] ?? match?.[1] ?? named?.[1] ?? tail?.[1] ?? "").replace(/\.$/, "");
  if (!raw) return null;
  if (/^(this|the|a|an|me|tomorrow|today|customer|everyone|monday|tuesday|wednesday|thursday|friday|saturday|sunday|contact|call|email|message)$/i.test(raw)) {
    return null;
  }
  return raw;
}

export function parseDueDateKey(text: string, today: DateParts = todayInBangkok()): string {
  return parseExplicitDateKey(text, today) ?? dateKeyFromParts(addCalendarDays(today, 1));
}

/** A date the staff member actually named. Does not invent tomorrow. */
export function parseExplicitDateKey(text: string, today: DateParts = todayInBangkok()): string | null {
  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];
  if (iso) return iso;
  if (/\btoday\b/i.test(text)) return dateKeyFromParts(today);
  if (/\btomorrow\b/i.test(text)) return dateKeyFromParts(addCalendarDays(today, 1));
  return null;
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

export type PaymentReminderDraft = {
  invoiceId: string;
  caseId: string;
  caseNumber: string;
  email: string;
  name: string;
  outstandingSatang: number;
};

export function draftPaymentReminder(item: PaymentReminderDraft): string {
  return [
    `Hello ${item.name},`,
    "",
    `This is a reminder from SiamEZ about booking ${item.caseNumber}.`,
    `The outstanding balance on our records is ${formatSatang(item.outstandingSatang)}.`,
    "",
    "If you have already paid, reply to this email and we will check the receipt.",
    "",
    "SiamEZ",
  ].join("\n");
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

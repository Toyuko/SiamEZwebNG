/**
 * Public staff-calendar shapes. This module is safe to import from the browser.
 * It never accepts or returns customer, invoice, or payment fields.
 */

import type { CalendarFilters, CalendarViewName } from "@/lib/calendar/schedule";
import { matchesProvince, parseProvinceParam, serializeProvinces } from "@/lib/calendar/schedule";

export const STAFF_EVENT_KEYS = [
  "id",
  "start",
  "end",
  "allDay",
  "service",
  "province",
  "location",
  "staff",
  "status",
  "ref",
] as const;

export type StaffCalendarEvent = {
  id: string;
  start: string;
  end: string;
  allDay: boolean;
  service: string;
  province: string | null;
  location: string | null;
  staff: string;
  status: string;
  ref: string | null;
};

export type StaffCalendarPayload = {
  events: StaffCalendarEvent[];
  services: Array<{ id: string; name: string }>;
  staff: string[];
  fetchedAt: string;
  truncated: boolean;
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+\d|\b0\d)[\d\s().-]{6,}\d/;

/** A display name only. An email-shaped name is withheld. */
export function publicStaffLabel(name: string | null | undefined): string {
  const trimmed = name?.trim() ?? "";
  if (!trimmed || trimmed.includes("@") || EMAIL_RE.test(trimmed)) return "TBD";
  return trimmed.slice(0, 80);
}

export function publicStaffNames(people: Array<{ name: string | null | undefined }>): string[] {
  const names = new Set<string>();
  for (const person of people) {
    const label = publicStaffLabel(person.name);
    if (label !== "TBD") names.add(label);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** Drop places that look like an email address or a phone number. */
export function safePlace(value: string | null | undefined): string | null {
  const text = value?.trim() ?? "";
  if (!text) return null;
  if (text.includes("@") || EMAIL_RE.test(text) || PHONE_RE.test(text)) return null;
  return text.slice(0, 180);
}

export function isPrivateStaffStatus(status: string): boolean {
  return status === "refunded" || status === "refund_pending";
}

/** Operational status only. Payment and refund states stay on the admin calendar. */
export function publicJobStatus(status: string): string {
  if (status === "confirmed" || status === "completed" || status === "cancelled" || status === "in_progress" || status === "pending_docs" || status === "scheduled") {
    return status;
  }
  return "scheduled";
}

export function staffEventMatches(
  event: StaffCalendarEvent,
  filters: CalendarFilters,
  serviceId: string | null
): boolean {
  if (isPrivateStaffStatus(event.status)) return false;
  if (!matchesProvince(event.province, filters.provinces)) return false;
  const staff = filters.staffId.trim();
  if (staff === "tbd" && event.staff !== "TBD") return false;
  if (staff && staff !== "tbd" && event.staff.toLowerCase() !== staff.toLowerCase()) return false;
  if (filters.serviceId && serviceId !== filters.serviceId) return false;
  const status = filters.status || "all";
  if (status === "confirmed" && event.status !== "confirmed") return false;
  if (status === "completed" && event.status !== "completed") return false;
  if (status === "cancelled" && event.status !== "cancelled") return false;
  if (status === "tbd" && !event.allDay) return false;
  if (status === "scheduled" && (event.allDay || event.status === "completed" || event.status === "cancelled")) {
    return false;
  }
  const q = filters.q.trim().toLowerCase();
  if (q.length < 2) return true;
  const haystack = [event.service, event.province, event.staff, event.ref]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

const FORBIDDEN_KEYS = new Set([
  "customeremail",
  "customerphone",
  "customername",
  "guestemail",
  "guestphone",
  "guestname",
  "email",
  "phone",
  "invoice",
  "invoiceid",
  "invoicenumber",
  "payment",
  "payments",
  "deposit",
  "depositamount",
  "documents",
  "document",
  "description",
  "jobdescription",
  "notes",
  "note",
  "totalsatang",
  "depositsatang",
  "outstandingsatang",
  "dealvalue",
  "userid",
  "caseid",
  "staffid",
  "password",
  "token",
  "access",
]);

function walkPublic(value: unknown, seen: WeakSet<object>): void {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) walkPublic(item, seen);
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      throw new Error("Staff calendar refused to send private data");
    }
    walkPublic(nested, seen);
  }
}

/** Fail closed if a private field name ever reaches the response. */
export function assertStaffPayload(payload: StaffCalendarPayload): void {
  walkPublic(payload, new WeakSet());
  const json = JSON.stringify(payload);
  if (EMAIL_RE.test(json)) throw new Error("Staff calendar refused to send contact details");
  for (const event of payload.events) {
    const keys = Object.keys(event).sort().join(",");
    const expected = [...STAFF_EVENT_KEYS].sort().join(",");
    if (keys !== expected) throw new Error("Staff calendar refused to send private data");
  }
}

export function staffCalendarHref(
  next: Partial<CalendarFilters & { view: CalendarViewName; date: string }> & { date: string; view: CalendarViewName }
): string {
  const params = new URLSearchParams();
  params.set("date", next.date);
  params.set("view", next.view === "threeday" ? "week" : next.view);
  if (next.provinces?.length) params.set("provinces", serializeProvinces(next.provinces));
  if (next.staffId) params.set("staff", next.staffId);
  if (next.serviceId) params.set("service", next.serviceId);
  if (next.status && next.status !== "all") params.set("status", next.status);
  if (next.q?.trim()) params.set("q", next.q.trim().slice(0, 80));
  return `/staff-calendar?${params.toString()}`;
}

export function staffFiltersFromParams(params: {
  provinces?: string;
  staff?: string;
  service?: string;
  status?: string;
  q?: string;
}): CalendarFilters {
  const status = params.status?.trim() || "all";
  const allowed = new Set(["all", "confirmed", "scheduled", "completed", "cancelled", "tbd"]);
  return {
    provinces: parseProvinceParam(params.provinces),
    staffId: (params.staff ?? "").slice(0, 80),
    serviceId: (params.service ?? "").slice(0, 80),
    status: allowed.has(status) ? status : "all",
    q: (params.q ?? "").trim().slice(0, 80),
  };
}

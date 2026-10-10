/**
 * Pure calendar rules. The Case row remains the source of truth.
 * All wall-clock dates are Asia/Bangkok.
 */

import type { CaseStatus } from "@prisma/client";
import {
  JOB_INTAKE_TIMEZONE,
  bangkokDateInputValue,
  bangkokDateTime,
  bangkokTimeInputValue,
  formatBangkokTime,
} from "@/lib/jobs/intake";
import { provinceStyle } from "@/lib/calendar/provinces";

export type CalendarViewName = "month" | "week" | "day" | "agenda" | "threeday";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const CALENDAR_START_HOUR = 7;
export const CALENDAR_END_HOUR = 21;

export type CalendarJobRecord = {
  caseId: string;
  caseNumber: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  serviceId: string | null;
  serviceName: string;
  staffId: string | null;
  staffName: string;
  closedByName: string | null;
  start: string | null;
  allDay: boolean;
  province: string | null;
  location: string | null;
  status: CaseStatus;
  invoiceId: string | null;
  invoiceNumber: string | null;
  totalSatang: number;
  depositSatang: number;
  outstandingSatang: number;
  documents: string[];
  description: string | null;
};

export type CalendarFilters = {
  provinces: string[];
  staffId: string;
  serviceId: string;
  status: string;
  q: string;
};

export type PublicAvailabilitySlot = {
  date: string;
  time: string;
  province: string;
  service: string;
  availability: "booked";
};

export type ScheduleWarning =
  | {
      kind: "conflict";
      staffName: string;
      existingCustomer: string;
      existingProvince: string | null;
      existingTime: string;
    }
  | {
      kind: "travel";
      staffName: string;
      province: string;
      otherProvince: string;
      otherTime: string;
    };

export const CALENDAR_WIDE_BREAKPOINT = 768;

export type CalendarContextName = "wide" | "narrow";

/** Tablet and desktop share the week default. Phones use the agenda. */
export function calendarContext(width: number): CalendarContextName {
  return width < CALENDAR_WIDE_BREAKPOINT ? "narrow" : "wide";
}

export function preferredCalendarView(width: number): CalendarViewName {
  return calendarContext(width) === "narrow" ? "agenda" : "week";
}

/**
 * A shared or bookmarked view wins. Otherwise each screen size keeps its own
 * saved view, then the responsive default (week on a wide screen, agenda on a phone).
 */
export function resolveCalendarView(input: {
  requested?: string;
  widePreference?: string;
  narrowPreference?: string;
  context: CalendarContextName;
}): CalendarViewName {
  const fallback = input.context === "narrow" ? "agenda" : "week";
  if (input.requested) return parseCalendarView(input.requested, fallback);
  const saved = input.context === "narrow" ? input.narrowPreference : input.widePreference;
  return parseCalendarView(saved, fallback);
}

export function parseCalendarView(value: string | undefined, fallback: CalendarViewName = "agenda"): CalendarViewName {
  if (value === "month" || value === "week" || value === "day" || value === "agenda" || value === "threeday") return value;
  return fallback;
}

export function calendarAnchor(value: string | undefined, now = new Date()): string {
  if (value && DATE_RE.test(value) && bangkokDateTime(value, "12:00")) return value;
  return bangkokDateInputValue(now);
}

function weekdayIndex(anchor: string): number {
  const noon = bangkokDateTime(anchor, "12:00");
  if (!noon) return 0;
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: JOB_INTAKE_TIMEZONE,
    weekday: "short",
  }).format(noon);
  const index = WEEKDAYS.indexOf(label as (typeof WEEKDAYS)[number]);
  return index < 0 ? 0 : index;
}

export function weekDates(anchor: string): string[] {
  const noon = bangkokDateTime(anchor, "12:00");
  if (!noon) return [anchor];
  const index = weekdayIndex(anchor);
  const mondayOffset = index === 0 ? -6 : 1 - index;
  const monday = new Date(noon.getTime() + mondayOffset * 24 * 60 * 60 * 1000);
  return Array.from({ length: 7 }, (_, day) => bangkokDateInputValue(new Date(monday.getTime() + day * 24 * 60 * 60 * 1000)));
}

export function monthGridDates(anchor: string): string[] {
  const safe = calendarAnchor(anchor);
  const [year, month] = safe.split("-").map(Number);
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const index = weekdayIndex(first);
  const leading = index === 0 ? 6 : index - 1;
  const days = new Date(year, month, 0).getDate();
  const total = Math.ceil((leading + days) / 7) * 7;
  const noon = bangkokDateTime(first, "12:00");
  if (!noon) return [first];
  const start = new Date(noon.getTime() - leading * 24 * 60 * 60 * 1000);
  return Array.from({ length: total }, (_, day) => bangkokDateInputValue(new Date(start.getTime() + day * 24 * 60 * 60 * 1000)));
}

export function threeDayDates(anchor: string): string[] {
  const noon = bangkokDateTime(calendarAnchor(anchor), "12:00");
  if (!noon) return [calendarAnchor(anchor)];
  return [0, 1, 2].map((day) => bangkokDateInputValue(new Date(noon.getTime() + day * 24 * 60 * 60 * 1000)));
}

export function agendaDates(anchor: string): string[] {
  const noon = bangkokDateTime(calendarAnchor(anchor), "12:00");
  if (!noon) return [calendarAnchor(anchor)];
  return Array.from({ length: 14 }, (_, day) => bangkokDateInputValue(new Date(noon.getTime() + day * 24 * 60 * 60 * 1000)));
}

export function monthCells(anchor: string): Array<string | null> {
  const [year, month] = anchor.split("-").map(Number);
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const index = weekdayIndex(first);
  const leading = index === 0 ? 6 : index - 1;
  const days = new Date(year, month, 0).getDate();
  const cells: Array<string | null> = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= days; day += 1) {
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function calendarRange(view: CalendarViewName, anchor: string): { start: Date; end: Date } {
  const safe = calendarAnchor(anchor);
  if (view === "month") {
    const dates = monthGridDates(safe);
    const start = bangkokDateTime(dates[0], "00:00")!;
    const last = bangkokDateTime(dates[dates.length - 1], "00:00")!;
    return { start, end: new Date(last.getTime() + 24 * 60 * 60 * 1000) };
  }
  if (view === "week" || view === "threeday") {
    const dates = view === "week" ? weekDates(safe) : threeDayDates(safe);
    const start = bangkokDateTime(dates[0], "00:00")!;
    const last = bangkokDateTime(dates[dates.length - 1], "00:00")!;
    return { start, end: new Date(last.getTime() + 24 * 60 * 60 * 1000) };
  }
  const start = bangkokDateTime(safe, "00:00")!;
  const days = view === "agenda" ? 14 : 1;
  return { start, end: new Date(start.getTime() + days * 24 * 60 * 60 * 1000) };
}

export function shiftAnchor(anchor: string, view: CalendarViewName, direction: -1 | 1): string {
  const safe = calendarAnchor(anchor);
  if (view === "month") {
    const [year, month] = safe.split("-").map(Number);
    const next = new Date(Date.UTC(year, month - 1 + direction, 1));
    return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-01`;
  }
  const days = view === "week" || view === "agenda" ? direction * 7 : view === "threeday" ? direction * 3 : direction;
  const noon = bangkokDateTime(safe, "12:00")!;
  return bangkokDateInputValue(new Date(noon.getTime() + days * 24 * 60 * 60 * 1000));
}

export function bangkokClockMinutes(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: JOB_INTAKE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function eventWindow(start: Date, allDay: boolean): { start: Date; end: Date } {
  if (allDay) {
    const day = bangkokDateInputValue(start);
    const from = bangkokDateTime(day, "00:00") ?? start;
    return { start: from, end: new Date(from.getTime() + 24 * 60 * 60 * 1000) };
  }
  return { start, end: new Date(start.getTime() + 60 * 60 * 1000) };
}

export function jobsOnDate(jobs: CalendarJobRecord[], date: string): CalendarJobRecord[] {
  return jobs
    .filter((job) => job.start && bangkokDateInputValue(new Date(job.start)) === date)
    .sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return (a.start ?? "").localeCompare(b.start ?? "");
    });
}

/** URL token for jobs that have no province yet. Province names never use this value. */
export const PROVINCE_NEEDED_TOKEN = "__needed";

export function parseProvinceParam(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (item === PROVINCE_NEEDED_TOKEN ? "" : item));
}

export function serializeProvinces(provinces: string[]): string {
  return provinces.map((item) => item || PROVINCE_NEEDED_TOKEN).join(",");
}

export function jobMatchesFilters(job: CalendarJobRecord, filters: CalendarFilters): boolean {
  if (filters.provinces.length > 0 && !filters.provinces.includes(job.province ?? "")) return false;
  if (filters.staffId === "tbd" && job.staffId) return false;
  if (filters.staffId && filters.staffId !== "tbd" && job.staffId !== filters.staffId) return false;
  if (filters.serviceId && job.serviceId !== filters.serviceId) return false;
  if (filters.status === "confirmed" && job.status !== "confirmed") return false;
  if (filters.status === "completed" && job.status !== "completed") return false;
  if (filters.status === "cancelled" && job.status !== "cancelled") return false;
  if (filters.status === "tbd" && !job.allDay) return false;
  if (filters.status === "scheduled" && (job.allDay || job.status === "cancelled" || job.status === "completed")) {
    return false;
  }
  const q = filters.q.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    job.customerName,
    job.customerPhone,
    job.customerEmail,
    job.invoiceNumber,
    job.caseNumber,
    job.caseId,
    job.serviceName,
    job.location,
    job.province,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function filterCalendarJobs(jobs: CalendarJobRecord[], filters: CalendarFilters): CalendarJobRecord[] {
  return jobs.filter((job) => jobMatchesFilters(job, filters));
}

export function calendarSummary(jobs: CalendarJobRecord[]) {
  const active = jobs.filter((job) => job.status !== "cancelled" && job.status !== "refunded");
  const provinces = new Map<string, number>();
  for (const job of active) {
    const label = job.province || "Province needed";
    provinces.set(label, (provinces.get(label) ?? 0) + 1);
  }
  return {
    jobs: active.length,
    dealValueSatang: active.reduce((sum, job) => sum + job.totalSatang, 0),
    depositSatang: active.reduce((sum, job) => sum + job.depositSatang, 0),
    outstandingSatang: active.reduce((sum, job) => sum + job.outstandingSatang, 0),
    provinces: [...provinces.entries()]
      .map(([name, count]) => ({ ...provinceStyle(name === "Province needed" ? null : name), name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}

export function toPublicSlot(input: {
  start: Date;
  allDay: boolean;
  province: string | null;
  serviceName: string;
  status: string;
}): PublicAvailabilitySlot | null {
  if (input.status === "cancelled" || input.status === "refunded" || input.status === "refund_pending") return null;
  return {
    date: bangkokDateInputValue(input.start),
    time: input.allDay ? "TBD" : formatBangkokTime(input.start),
    province: input.province ?? "Province needed",
    service: input.serviceName,
    availability: "booked",
  };
}

export function schedulingWarnings(
  candidate: {
    caseId: string;
    staffId: string | null;
    staffName: string;
    start: Date;
    end: Date;
    province: string | null;
  },
  others: Array<{
    caseId: string;
    staffId: string | null;
    staffName: string;
    customerName: string;
    province: string | null;
    start: Date;
    end: Date;
    status: string;
  }>
): ScheduleWarning[] {
  if (!candidate.staffId) return [];
  const warnings: ScheduleWarning[] = [];
  for (const other of others) {
    if (other.caseId === candidate.caseId || other.staffId !== candidate.staffId) continue;
    if (other.status === "cancelled" || other.status === "refunded") continue;
    const overlaps = candidate.start < other.end && other.start < candidate.end;
    if (overlaps) {
      warnings.push({
        kind: "conflict",
        staffName: candidate.staffName,
        existingCustomer: other.customerName,
        existingProvince: other.province,
        existingTime: formatBangkokTime(other.start),
      });
      continue;
    }
    const gap = Math.abs(candidate.start.getTime() - other.start.getTime());
    if (
      candidate.province &&
      other.province &&
      candidate.province !== other.province &&
      gap < 3 * 60 * 60 * 1000
    ) {
      warnings.push({
        kind: "travel",
        staffName: candidate.staffName,
        province: candidate.province,
        otherProvince: other.province,
        otherTime: formatBangkokTime(other.start),
      });
    }
  }
  return warnings;
}

export function planBackfill(
  jobs: Array<{ caseId: string; scheduledAt: Date | null; primaryEventId: string | null }>
) {
  let already = 0;
  let added = 0;
  let unscheduled = 0;
  for (const job of jobs) {
    if (!job.scheduledAt) {
      unscheduled += 1;
      continue;
    }
    if (job.primaryEventId) already += 1;
    else added += 1;
  }
  return { scanned: jobs.length, already, added, unscheduled, errors: 0 };
}

export function reschedulePlan(
  job: { caseId: string; invoiceId: string | null; customerId: string | null },
  date: string,
  time: string
) {
  return {
    caseId: job.caseId,
    invoiceId: job.invoiceId,
    customerId: job.customerId,
    scheduledAt: bangkokDateTime(date, time),
  };
}

export function isUnscheduledJob(job: { scheduledAt: Date | string | null; status: string }): boolean {
  if (job.scheduledAt) return false;
  return ["awaiting_payment", "confirmed", "in_progress", "pending_docs"].includes(job.status);
}

export type ManualCalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  allDay: boolean;
  type: "appointment" | "deadline" | "milestone";
  color: string | null;
  staffId: string | null;
  staffName: string | null;
};

export const MANUAL_EVENT_TYPES = ["appointment", "deadline", "milestone"] as const;
export const MANUAL_EVENT_COLORS = ["blue", "red", "emerald", "amber", "purple", "cyan", "pink", "orange"] as const;

/** The calendar date after `date`, using the date itself rather than a timezone. */
export function nextCalendarDate(date: string): string {
  if (!DATE_RE.test(date)) return "";
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

/** Bangkok start/end for a manual event. All-day end dates are inclusive. */
export function manualEventWindow(input: {
  date: string;
  time: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
}): { start: Date; end: Date } | null {
  if (input.allDay) {
    const start = bangkokDateTime(input.date, "00:00");
    const end = bangkokDateTime(nextCalendarDate(input.endDate), "00:00");
    if (!start || !end || end.getTime() <= start.getTime()) return null;
    return { start, end };
  }
  const start = bangkokDateTime(input.date, input.time);
  const end = bangkokDateTime(input.endDate, input.endTime);
  if (!start || !end || end.getTime() <= start.getTime()) return null;
  return { start, end };
}

export function shiftCalendarDate(date: string, days: number): string {
  if (!DATE_RE.test(date) || !Number.isInteger(days)) return "";
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function inclusiveEventDays(startIso: string, endIso: string): number {
  const start = bangkokDateInputValue(new Date(startIso));
  const end = bangkokDateInputValue(new Date(new Date(endIso).getTime() - 60_000));
  let count = 1;
  let cursor = start;
  while (cursor && end && cursor < end && count < 62) {
    cursor = nextCalendarDate(cursor);
    count += 1;
  }
  return count;
}

/** New start for a dragged event. A timed drop keeps the duration. An all-day drop keeps the day span. */
export function movedManualEvent(event: ManualCalendarEvent, date: string, time: string | null) {
  if (!DATE_RE.test(date)) return null;
  const description = event.description ?? "";
  const color = event.color ?? "";
  if (time === null) {
    const span = event.allDay ? inclusiveEventDays(event.start, event.end) : 1;
    const endDate = shiftCalendarDate(date, span - 1);
    if (!endDate) return null;
    return {
      id: event.id,
      title: event.title,
      description,
      date,
      time: "00:00",
      endDate,
      endTime: "00:00",
      allDay: true,
      type: event.type,
      color,
      staffId: event.staffId,
    };
  }
  const start = bangkokDateTime(date, time);
  if (!start) return null;
  const duration = event.allDay
    ? 60 * 60 * 1000
    : Math.max(new Date(event.end).getTime() - new Date(event.start).getTime(), 30 * 60 * 1000);
  const end = new Date(start.getTime() + duration);
  return {
    id: event.id,
    title: event.title,
    description,
    date,
    time,
    endDate: bangkokDateInputValue(end),
    endTime: bangkokTimeInputValue(end),
    allDay: false,
    type: event.type,
    color,
    staffId: event.staffId,
  };
}

export function eventCoversDate(event: { start: string; end: string }, date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const start = new Date(event.start).getTime();
  const end = new Date(event.end).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  const dayStart = new Date(`${date}T00:00:00+07:00`).getTime();
  return start < dayStart + 24 * 60 * 60 * 1000 && end > dayStart;
}

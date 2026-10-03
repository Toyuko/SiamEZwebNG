/**
 * Pure rules for mobile confirmed-job intake.
 * Money is satang. Dates are interpreted in Asia/Bangkok (no DST).
 * The database row is the source of truth for copy text and invoices.
 */

import type { CaseStatus } from "@prisma/client";
import { isStaffRole } from "@/lib/auth/roles";

export const JOB_INTAKE_TIMEZONE = "Asia/Bangkok";
export const JOB_INTAKE_DEPOSIT_SOURCE = "job_intake_deposit";
export const JOB_INTAKE_EVENT_MARKER = "[job-intake]";

export const LEAD_SOURCES = ["facebook", "line", "whatsapp", "email", "other"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  facebook: "Facebook",
  line: "LINE",
  whatsapp: "WhatsApp",
  email: "Email",
  other: "Other",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const IDEMPOTENCY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CustomerChoice = "use_existing" | "create_new";

export type JobIntakeInput = {
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  leadSource: string;
  leadSourceDetail?: string | null;
  closedByStaffId: string;
  assignedStaffId?: string | null;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  timeTbd?: boolean;
  serviceId?: string | null;
  otherServiceName?: string | null;
  jobDescription?: string | null;
  totalPrice: string | number;
  depositAmount?: string | number | null;
  location?: string | null;
  documentsRequired?: string[] | null;
  idempotencyKey?: string | null;
  customerChoice?: CustomerChoice | null;
  existingCustomerId?: string | null;
};

export type ValidatedJobIntake = {
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  leadSource: LeadSource;
  leadSourceDetail: string | null;
  closedByStaffId: string;
  assignedStaffId: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  timeTbd: boolean;
  scheduledAt: Date | null;
  serviceId: string | null;
  otherServiceName: string | null;
  jobDescription: string | null;
  totalSatang: number;
  depositSatang: number;
  outstandingSatang: number;
  location: string | null;
  documentsRequired: string[];
  idempotencyKey: string | null;
  customerChoice: CustomerChoice | null;
  existingCustomerId: string | null;
};

export type FieldErrors = Record<string, string>;

export class JobIntakeValidationError extends Error {
  fieldErrors: FieldErrors;
  constructor(message: string, fieldErrors: FieldErrors) {
    super(message);
    this.name = "JobIntakeValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export class CustomerChoiceRequiredError extends Error {
  candidates: CustomerRecord[];
  constructor(candidates: CustomerRecord[]) {
    super("Choose whether to use the existing customer.");
    this.name = "CustomerChoiceRequiredError";
    this.candidates = candidates;
  }
}

export function assertJobIntakeAccess(role: string | null | undefined): void {
  if (!isStaffRole(role)) {
    throw new Error("Unauthorized");
  }
}

export function parseThbToSatang(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw < 0) return null;
    return Math.round(raw * 100);
  }
  const cleaned = raw.replace(/[฿,\s]/g, "").trim();
  if (!cleaned) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export function formatThb(satang: number): string {
  const baht = satang / 100;
  const whole = Number.isInteger(baht);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(baht);
  return `฿${formatted}`;
}

export function outstandingSatang(totalSatang: number, depositSatang: number): number {
  return Math.max(0, totalSatang - depositSatang);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function phoneDigits(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
}

/** Compare the last 9 digits so +66 and 0 prefixes can match a Thai mobile. */
export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = phoneDigits(a);
  const db = phoneDigits(b);
  if (da.length < 9 || db.length < 9) return false;
  return da.slice(-9) === db.slice(-9);
}

export function bangkokDateTime(date: string, time: string): Date | null {
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) return null;
  const parsed = new Date(`${date}T${time}:00+07:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JOB_INTAKE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(parsed);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const roundTrip = `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  if (roundTrip !== `${date}T${time}`) return null;
  return parsed;
}

export function formatBangkokDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: JOB_INTAKE_TIMEZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatBangkokTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: JOB_INTAKE_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .replace(/\u202f/g, " ");
}

export function bangkokDateInputValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JOB_INTAKE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function bangkokTimeInputValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: JOB_INTAKE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("hour")}:${get("minute")}`;
}

export function leadSourceLabel(source: string | null | undefined, detail: string | null | undefined): string {
  if (source === "other") return detail?.trim() || "Other";
  if (source && source in LEAD_SOURCE_LABELS) return LEAD_SOURCE_LABELS[source as LeadSource];
  return source?.trim() || "—";
}

export function caseServiceName(record: {
  service?: { name: string } | null;
  otherServiceName?: string | null;
} | null | undefined): string {
  if (!record) return "Other";
  const other = record.otherServiceName?.trim();
  if (!record.service && other) return other;
  return record.service?.name || other || "Other";
}

export function parseDocumentsRequired(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const name = item.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

export function validateJobIntake(raw: JobIntakeInput, options?: { requireIdempotencyKey?: boolean }): ValidatedJobIntake {
  const fieldErrors: FieldErrors = {};
  const customerName = raw.customerName?.trim() ?? "";
  const customerEmail = normalizeEmail(raw.customerEmail ?? "");
  const customerPhone = raw.customerPhone?.trim() || null;
  const leadSource = raw.leadSource?.trim() ?? "";
  const leadSourceDetail = raw.leadSourceDetail?.trim() || null;
  const closedByStaffId = raw.closedByStaffId?.trim() ?? "";
  const assignedRaw = raw.assignedStaffId?.trim() || "";
  const assignedStaffId = !assignedRaw || assignedRaw === "tbd" ? null : assignedRaw;
  const scheduledDate = raw.scheduledDate?.trim() || null;
  const timeTbd = raw.timeTbd === true || raw.scheduledTime === "TBD";
  const scheduledTime = timeTbd ? null : raw.scheduledTime?.trim() || null;
  const serviceId = raw.serviceId?.trim() || null;
  const otherServiceName = raw.otherServiceName?.trim() || null;
  const jobDescription = raw.jobDescription?.trim() || null;
  const location = raw.location?.trim() || null;
  const documentsRequired = parseDocumentsRequired(raw.documentsRequired ?? []);
  const idempotencyKey = raw.idempotencyKey?.trim() ?? "";

  if (!customerName) fieldErrors.customerName = "Customer name is required.";
  if (!customerEmail) fieldErrors.customerEmail = "Customer email is required.";
  else if (!EMAIL_RE.test(customerEmail)) fieldErrors.customerEmail = "Enter a valid email address.";
  if (!leadSource) fieldErrors.leadSource = "Source is required.";
  else if (!LEAD_SOURCES.includes(leadSource as LeadSource)) fieldErrors.leadSource = "Choose a valid source.";
  else if (leadSource === "other" && !leadSourceDetail) {
    fieldErrors.leadSourceDetail = "Enter the other source.";
  }
  if (!closedByStaffId) fieldErrors.closedByStaffId = "Closed by is required.";
  if (assignedStaffId && assignedStaffId === closedByStaffId) {
    // Same person may close and perform the job. Allowed.
  }
  if (serviceId && serviceId !== "other") {
    // catalog id checked against the database later
  } else if (!otherServiceName) {
    fieldErrors.serviceId = "Choose a job type or enter Other.";
  }
  if (scheduledDate && !DATE_RE.test(scheduledDate)) fieldErrors.scheduledDate = "Enter a valid date.";
  if (scheduledTime && !TIME_RE.test(scheduledTime)) fieldErrors.scheduledTime = "Enter a valid time.";
  const requireKey = options?.requireIdempotencyKey !== false;
  if (requireKey && (!idempotencyKey || !IDEMPOTENCY_RE.test(idempotencyKey))) {
    fieldErrors.idempotencyKey = "Missing a valid submission key. Refresh and try again.";
  }

  const totalSatang = parseThbToSatang(raw.totalPrice);
  if (totalSatang == null) fieldErrors.totalPrice = "Enter a valid total price.";
  else if (totalSatang < 0) fieldErrors.totalPrice = "Total price cannot be negative.";

  const depositRaw = raw.depositAmount == null || raw.depositAmount === "" ? "0" : raw.depositAmount;
  const depositSatang = parseThbToSatang(depositRaw);
  if (depositSatang == null) fieldErrors.depositAmount = "Enter a valid deposit.";
  else if (depositSatang < 0) fieldErrors.depositAmount = "Deposit cannot be negative.";
  else if (totalSatang != null && depositSatang > totalSatang) {
    fieldErrors.depositAmount = "Deposit cannot exceed the total price.";
  }

  let scheduledAt: Date | null = null;
  if (scheduledDate && !fieldErrors.scheduledDate) {
    const timeForClock = scheduledTime ?? "00:00";
    scheduledAt = bangkokDateTime(scheduledDate, timeForClock);
    if (!scheduledAt) fieldErrors.scheduledDate = "Enter a valid date.";
  }

  if (Object.keys(fieldErrors).length > 0 || totalSatang == null || depositSatang == null) {
    throw new JobIntakeValidationError("Check the highlighted fields.", fieldErrors);
  }

  const usingOther = !serviceId || serviceId === "other";
  return {
    customerName,
    customerEmail,
    customerPhone,
    leadSource: leadSource as LeadSource,
    leadSourceDetail: leadSource === "other" ? leadSourceDetail : null,
    closedByStaffId,
    assignedStaffId,
    scheduledDate,
    scheduledTime,
    timeTbd: Boolean(scheduledDate && timeTbd),
    scheduledAt,
    serviceId: usingOther ? null : serviceId,
    otherServiceName: usingOther ? otherServiceName : null,
    jobDescription,
    totalSatang,
    depositSatang,
    outstandingSatang: outstandingSatang(totalSatang, depositSatang),
    location,
    documentsRequired,
    idempotencyKey: requireKey ? idempotencyKey : null,
    customerChoice: raw.customerChoice ?? null,
    existingCustomerId: raw.existingCustomerId?.trim() || null,
  };
}

export type CustomerRecord = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
};

export type CustomerDecision =
  | { action: "reuse"; userId: string; customer: CustomerRecord }
  | { action: "create" }
  | { action: "needs_choice"; candidates: CustomerRecord[] };

export function decideCustomer(input: {
  emailMatch: CustomerRecord | null;
  phoneMatches: CustomerRecord[];
  choice: CustomerChoice | null;
  existingCustomerId: string | null;
}): CustomerDecision {
  if (input.emailMatch) {
    return { action: "reuse", userId: input.emailMatch.id, customer: input.emailMatch };
  }
  const candidates = input.phoneMatches.filter((row, index, all) => all.findIndex((r) => r.id === row.id) === index);
  if (candidates.length === 0) return { action: "create" };
  if (input.choice === "create_new") return { action: "create" };
  if (input.choice === "use_existing" && input.existingCustomerId) {
    const chosen = candidates.find((c) => c.id === input.existingCustomerId);
    if (chosen) return { action: "reuse", userId: chosen.id, customer: chosen };
  }
  return { action: "needs_choice", candidates };
}

export function formatSequentialInvoiceNumber(year: number, sequence: number): string {
  return `INV-${year}-${String(sequence).padStart(5, "0")}`;
}

export function invoiceSequenceFromNumber(invoiceNumber: string, year: number): number | null {
  const match = new RegExp(`^INV-${year}-(\\d+)$`).exec(invoiceNumber);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function nextInvoiceSequence(existingNumbers: string[], year: number): number {
  let max = 0;
  for (const value of existingNumbers) {
    const n = invoiceSequenceFromNumber(value, year);
    if (n != null && n > max) max = n;
  }
  return max + 1;
}

/** Public display number. Older invoices keep the id-prefix format. */
export function displayInvoiceNumber(invoice: { id: string; invoiceNumber?: string | null }): string {
  return invoice.invoiceNumber?.trim() || `INV-${invoice.id.slice(0, 8).toUpperCase()}`;
}

export type JobCopyInput = {
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  leadSource: string | null;
  leadSourceDetail: string | null;
  staffName: string;
  scheduledAt: Date | null;
  timeTbd: boolean;
  jobType: string;
  jobDescription: string | null;
  totalSatang: number;
  depositSatang: number;
  outstandingSatang: number;
  location: string | null;
  documents: string[];
  invoiceNumber: string;
};

export function buildJobCopyText(input: JobCopyInput): string {
  const dateLabel = input.scheduledAt ? formatBangkokDate(input.scheduledAt) : "TBD";
  const timeLabel = !input.scheduledAt || input.timeTbd ? "TBD" : formatBangkokTime(input.scheduledAt);
  const docs =
    input.documents.length > 0
      ? input.documents.map((name) => `* ${name}`).join("\n")
      : "* None listed";
  return [
    "Customer information",
    `Name: ${input.customerName}`,
    `Email: ${input.customerEmail}`,
    `Phone: ${input.customerPhone || "—"}`,
    `Source: ${leadSourceLabel(input.leadSource, input.leadSourceDetail)}`,
    "",
    "Staff and Scheduling information",
    `Staff: ${input.staffName}`,
    `Date: ${dateLabel}`,
    `Time: ${timeLabel}`,
    "",
    "Service Information",
    `Job Type: ${input.jobType}`,
    `Job description: ${input.jobDescription || "—"}`,
    `Total Price: ${formatThb(input.totalSatang)}`,
    `Deposit amount: ${formatThb(input.depositSatang)}`,
    `Outstanding Balance: ${formatThb(input.outstandingSatang)}`,
    `Location: ${input.location || "—"}`,
    "",
    "Documents to be prepared:",
    "",
    docs,
    "",
    `Invoice: ${input.invoiceNumber}`,
  ].join("\n");
}

export function invoiceLineItems(jobType: string, jobDescription: string | null, totalSatang: number) {
  const description = jobDescription ? `${jobType} — ${jobDescription}` : jobType;
  return [
    {
      description,
      quantity: 1,
      unitAmountSatang: totalSatang,
      lineTotalSatang: totalSatang,
    },
  ];
}

export function invoiceStatusForDeposit(totalSatang: number, depositSatang: number): "paid" | "unpaid" {
  if (totalSatang > 0 && depositSatang >= totalSatang) return "paid";
  return "unpaid";
}

export type CalendarPlan =
  | { action: "none" }
  | {
      action: "upsert";
      title: string;
      description: string;
      start: Date;
      end: Date;
      allDay: boolean;
    };

export function planCalendarEvent(input: {
  customerName: string;
  jobType: string;
  staffName: string;
  location: string | null;
  status: string;
  scheduledAt: Date | null;
  timeTbd: boolean;
}): CalendarPlan {
  if (!input.scheduledAt) return { action: "none" };
  const allDay = input.timeTbd;
  const start = input.scheduledAt;
  const end = allDay ? new Date(start.getTime() + 24 * 60 * 60 * 1000) : new Date(start.getTime() + 60 * 60 * 1000);
  const description = [
    JOB_INTAKE_EVENT_MARKER,
    `Customer: ${input.customerName}`,
    `Service: ${input.jobType}`,
    `Staff: ${input.staffName}`,
    `Location: ${input.location || "—"}`,
    `Status: ${input.status}`,
  ].join("\n");
  return {
    action: "upsert",
    title: `${input.customerName} — ${input.jobType}`,
    description,
    start,
    end,
    allDay,
  };
}

export function staffDisplayName(user: { name: string | null; email: string } | null | undefined): string {
  return user?.name?.trim() || user?.email || "TBD";
}

/** Copy-template "Staff" line: assigned performer, or the closer when assignment is TBD. */
export function copyStaffName(
  assigned: { name: string | null; email: string } | null | undefined,
  closedBy: { name: string | null; email: string } | null | undefined
): string {
  if (assigned) return staffDisplayName(assigned);
  return staffDisplayName(closedBy);
}

export function jobMoneyReconciliation(totalSatang: number, depositSatang: number) {
  return {
    contractValue: totalSatang,
    paid: depositSatang,
    outstanding: outstandingSatang(totalSatang, depositSatang),
    countsFullAmountAsCash: false,
  };
}

export type ScheduleWindow = "today" | "tomorrow" | "week" | "month" | "all";

export function scheduleWindowRange(window: ScheduleWindow, now = new Date()): { start: Date; end: Date } | null {
  if (window === "all") return null;
  const date = bangkokDateInputValue(now);
  const startOfDay = bangkokDateTime(date, "00:00");
  if (!startOfDay) return null;
  const addDays = (days: number) => new Date(startOfDay.getTime() + days * 24 * 60 * 60 * 1000);
  if (window === "today") return { start: startOfDay, end: addDays(1) };
  if (window === "tomorrow") return { start: addDays(1), end: addDays(2) };
  if (window === "week") {
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: JOB_INTAKE_TIMEZONE,
      weekday: "short",
    }).format(now);
    const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
    const mondayOffset = index === 0 ? -6 : 1 - index;
    const start = addDays(mondayOffset);
    return { start, end: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000) };
  }
  const [year, month] = date.split("-").map(Number);
  const start = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+07:00`);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+07:00`);
  return { start, end };
}

export function jobFormValuesFromRecord(job: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  leadSource: string | null;
  leadSourceDetail: string | null;
  closedBy: { id: string } | null;
  assignedStaff: { id: string } | null;
  scheduledAt: string | null;
  scheduleTimeTbd: boolean;
  serviceId: string | null;
  otherServiceName: string | null;
  jobDescription: string | null;
  location: string | null;
  documents: string[];
  totalSatang: number;
  depositSatang: number;
  status: CaseStatus;
}) {
  const scheduled = job.scheduledAt ? new Date(job.scheduledAt) : null;
  return {
    customerName: job.customerName,
    customerEmail: job.customerEmail,
    customerPhone: job.customerPhone,
    leadSource: (job.leadSource as LeadSource) || "",
    leadSourceDetail: job.leadSourceDetail ?? "",
    closedByStaffId: job.closedBy?.id ?? "",
    assignedStaffId: job.assignedStaff?.id ?? "tbd",
    scheduledDate: scheduled ? bangkokDateInputValue(scheduled) : "",
    scheduledTime: scheduled && !job.scheduleTimeTbd ? bangkokTimeInputValue(scheduled) : "",
    timeTbd: job.scheduleTimeTbd,
    serviceId: job.serviceId ?? "other",
    otherServiceName: job.otherServiceName ?? "",
    jobDescription: job.jobDescription ?? "",
    totalPrice: String(job.totalSatang / 100),
    depositAmount: String(job.depositSatang / 100),
    location: job.location ?? "",
    documents: job.documents,
    status: job.status,
  };
}

export function paymentStanding(totalSatang: number, paidSatang: number): "unpaid" | "partial" | "paid" {
  if (paidSatang <= 0) return "unpaid";
  if (totalSatang > 0 && paidSatang >= totalSatang) return "paid";
  return "partial";
}

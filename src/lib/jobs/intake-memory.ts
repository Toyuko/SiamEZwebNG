/**
 * Saved job-intake links.
 * A token URL restores the form details and the memory note. It does not create a job.
 */

import { randomBytes } from "node:crypto";
import type { CaseStatus } from "@prisma/client";
import { LEAD_SOURCES, type LeadSource } from "@/lib/jobs/intake";
import { normalizeProvince } from "@/lib/calendar/provinces";
import { resolvePublicSiteUrl } from "@/config/site-url";

export const JOB_INTAKE_MEMORY_TOKEN_RE = /^[A-Za-z0-9_-]{20,48}$/;

const CASE_STATUSES = [
  "new",
  "under_review",
  "quoted",
  "custom_quote_required",
  "awaiting_payment",
  "awaiting_initial_payment",
  "initial_payment_paid",
  "paid",
  "in_progress",
  "milestone_due",
  "pending_docs",
  "completed",
  "cancelled",
  "refund_pending",
  "refunded",
  "confirmed",
] as const satisfies readonly CaseStatus[];

const CASE_STATUS_SET = new Set<string>(CASE_STATUSES);

export type JobIntakeMemoryDetails = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  leadSource: LeadSource | "";
  leadSourceDetail: string;
  closedByStaffId: string;
  assignedStaffId: string;
  scheduledDate: string;
  scheduledTime: string;
  timeTbd: boolean;
  serviceId: string;
  otherServiceName: string;
  jobDescription: string;
  totalPrice: string;
  depositAmount: string;
  location: string;
  province: string;
  documents: string[];
  status: CaseStatus;
  createReceipt: boolean;
  customerChoice: "use_existing" | "create_new" | null;
  existingCustomerId: string | null;
};

export function emptyJobIntakeMemoryDetails(): JobIntakeMemoryDetails {
  return {
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    leadSource: "",
    leadSourceDetail: "",
    closedByStaffId: "",
    assignedStaffId: "tbd",
    scheduledDate: "",
    scheduledTime: "",
    timeTbd: false,
    serviceId: "",
    otherServiceName: "",
    jobDescription: "",
    totalPrice: "",
    depositAmount: "0",
    location: "",
    province: "",
    documents: [],
    status: "confirmed",
    createReceipt: true,
    customerChoice: null,
    existingCustomerId: null,
  };
}

export function isJobIntakeMemoryToken(token: string): boolean {
  return JOB_INTAKE_MEMORY_TOKEN_RE.test(token);
}

export function createJobIntakeMemoryToken(): string {
  return randomBytes(18).toString("base64url");
}

export function jobIntakeMemoryPath(token: string, locale = "en"): string {
  return `/${locale}/jobs/saved/${token}`;
}

/** Origin of the request that is serving the saved link, so the brief matches that URL. */
export function originFromHeaders(headerList: { get(name: string): string | null }): string {
  const host = headerList.get("x-forwarded-host")?.split(",")[0]?.trim() || headerList.get("host")?.trim() || "";
  if (!host) return resolvePublicSiteUrl();
  const forwardedProto = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto =
    forwardedProto || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** Coerce a saved or submitted payload into the fields the form can restore. */
export function sanitizeJobIntakeMemoryDetails(value: unknown): JobIntakeMemoryDetails {
  const raw = asRecord(value);
  const empty = emptyJobIntakeMemoryDetails();
  const leadSource = clip(raw.leadSource, 40);
  const status = clip(raw.status, 40);
  const choice = raw.customerChoice;
  const documents = Array.isArray(raw.documents) ? raw.documents : [];
  const seen = new Set<string>();
  const cleanDocs: string[] = [];
  for (const item of documents) {
    const name = clip(item, 200);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleanDocs.push(name);
    if (cleanDocs.length >= 30) break;
  }

  return {
    customerName: clip(raw.customerName, 200),
    customerEmail: clip(raw.customerEmail, 320).toLowerCase(),
    customerPhone: clip(raw.customerPhone, 40),
    leadSource: (LEAD_SOURCES as readonly string[]).includes(leadSource) ? (leadSource as LeadSource) : "",
    leadSourceDetail: clip(raw.leadSourceDetail, 200),
    closedByStaffId: clip(raw.closedByStaffId, 64),
    assignedStaffId: clip(raw.assignedStaffId, 64) || empty.assignedStaffId,
    scheduledDate: /^\d{4}-\d{2}-\d{2}$/.test(clip(raw.scheduledDate, 10)) ? clip(raw.scheduledDate, 10) : "",
    scheduledTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(clip(raw.scheduledTime, 5))
      ? clip(raw.scheduledTime, 5)
      : "",
    timeTbd: flag(raw.timeTbd, false),
    serviceId: clip(raw.serviceId, 64),
    otherServiceName: clip(raw.otherServiceName, 200),
    jobDescription: clip(raw.jobDescription, 8000),
    totalPrice: clip(raw.totalPrice, 20),
    depositAmount: clip(raw.depositAmount, 20) || "0",
    location: clip(raw.location, 300),
    province: normalizeProvince(clip(raw.province, 80)) ?? "",
    documents: cleanDocs,
    status: CASE_STATUS_SET.has(status) ? (status as CaseStatus) : "confirmed",
    createReceipt: flag(raw.createReceipt, true),
    customerChoice: choice === "use_existing" || choice === "create_new" ? choice : null,
    existingCustomerId: clip(raw.existingCustomerId, 64) || null,
  };
}

export function sanitizeJobIntakeMemoryNote(value: unknown): string {
  return clip(value, 8000);
}

export function isCaseId(value: unknown): value is string {
  return typeof value === "string" && /^c[a-z0-9]{20,32}$/i.test(value);
}

function optionName(
  id: string,
  options: { id: string; name: string | null }[] | undefined,
  emptyLabel: string
): string {
  if (!id || id === "tbd") return emptyLabel;
  const match = options?.find((option) => option.id === id);
  return match?.name?.trim() || id;
}

export function formatJobIntakeMemoryBrief(input: {
  url: string;
  updatedAt: Date;
  caseId: string | null;
  memory: string;
  details: JobIntakeMemoryDetails;
  services?: { id: string; name: string }[];
  staff?: { id: string; name: string | null }[];
}): string {
  const { details } = input;
  const service =
    details.serviceId === "other"
      ? details.otherServiceName || "Other"
      : optionName(details.serviceId, input.services, "—");
  const lines = [
    "SiamEZ job intake memory",
    `URL: ${input.url}`,
    `Updated: ${input.updatedAt.toISOString()}`,
    `Confirmed job: ${input.caseId ?? "not created yet"}`,
    "",
    "Memory:",
    input.memory.trim() || "(none)",
    "",
    "Details:",
    `Customer: ${details.customerName || "—"}`,
    `Email: ${details.customerEmail || "—"}`,
    `Phone: ${details.customerPhone || "—"}`,
    `Source: ${details.leadSource || "—"}${details.leadSourceDetail ? ` (${details.leadSourceDetail})` : ""}`,
    `Closed by: ${optionName(details.closedByStaffId, input.staff, "—")}`,
    `Assigned staff: ${optionName(details.assignedStaffId, input.staff, "TBD")}`,
    `Date: ${details.scheduledDate || "TBD"}`,
    `Time: ${details.timeTbd ? "TBD" : details.scheduledTime || "TBD"}`,
    `Service: ${service}`,
    `Description: ${details.jobDescription || "—"}`,
    `Total (THB): ${details.totalPrice || "—"}`,
    `Deposit (THB): ${details.depositAmount || "0"}`,
    `Location: ${details.location || "—"}`,
    `Province: ${details.province || "—"}`,
    `Documents: ${details.documents.length ? details.documents.join(", ") : "—"}`,
    `Create receipt: ${details.createReceipt ? "yes" : "no"}`,
    `Status: ${details.status}`,
    `Customer choice: ${details.customerChoice ?? "—"}`,
    `Existing customer id: ${details.existingCustomerId ?? "—"}`,
  ];
  return lines.join("\n");
}

export function jobIntakeMemoryJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

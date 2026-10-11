/**
 * Server-side staff calendar rules. The Case row stays the source of truth.
 * Public ids are hashes so database ids are not sent to the browser.
 */

import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { eventWindow, type CalendarFilters, type CalendarViewName } from "@/lib/calendar/schedule";
import {
  publicJobStatus,
  publicStaffLabel,
  safePlace,
  type StaffCalendarEvent,
} from "@/lib/calendar/staff-calendar-shared";

const PRIVATE_STATUSES = ["refunded", "refund_pending"] as const;
const MAX_RANGE_MS = 45 * 24 * 60 * 60 * 1000;

export function staffEventKey(sourceId: string): string {
  return createHash("sha256").update(`siamez-staff-calendar:v1:${sourceId}`).digest("base64url").slice(0, 16);
}

export function assertStaffRange(start: Date, end: Date): void {
  const span = end.getTime() - start.getTime();
  if (!Number.isFinite(span) || span <= 0 || span > MAX_RANGE_MS) {
    throw new Error("Invalid calendar range");
  }
}

export function normalizeStaffView(view: CalendarViewName): Exclude<CalendarViewName, "threeday"> {
  return view === "threeday" ? "week" : view;
}

export function buildStaffEvent(input: {
  sourceId: string;
  caseNumber: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
  serviceName: string;
  province: string | null;
  location: string | null;
  staffName: string | null;
  status: string;
}): StaffCalendarEvent {
  const service = input.serviceName.trim() || "Service";
  return {
    id: staffEventKey(input.sourceId),
    start: input.start.toISOString(),
    end: input.end.toISOString(),
    allDay: input.allDay,
    service: service.slice(0, 120),
    province: input.province?.trim() || null,
    location: safePlace(input.location),
    staff: publicStaffLabel(input.staffName),
    status: publicJobStatus(input.status),
    ref: input.caseNumber?.trim() || null,
  };
}

export function jobStaffEvent(input: {
  sourceId: string;
  caseNumber: string;
  start: Date;
  allDay: boolean;
  serviceName: string;
  province: string | null;
  location: string | null;
  staffName: string | null;
  status: string;
}): StaffCalendarEvent {
  const window = eventWindow(input.start, input.allDay);
  return buildStaffEvent({ ...input, start: window.start, end: window.end });
}

function provinceClause(provinces: string[]): Prisma.CaseWhereInput | null {
  if (provinces.length === 0) return null;
  const names = provinces.filter(Boolean);
  const missing = provinces.includes("");
  if (missing && names.length > 0) return { OR: [{ province: { in: names } }, { province: null }] };
  if (missing) return { province: null };
  return { province: { in: names } };
}

function andWhere(where: Prisma.CaseWhereInput, extra: Prisma.CaseWhereInput | null) {
  if (!extra) return;
  const current = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
  where.AND = [...current, extra];
}

export function staffCaseWhere(start: Date, end: Date, filters: CalendarFilters): Prisma.CaseWhereInput {
  const where: Prisma.CaseWhereInput = { scheduledAt: { gte: start, lt: end } };
  andWhere(where, provinceClause(filters.provinces));
  const staff = filters.staffId.trim();
  if (staff === "tbd") {
    where.OR = [
      { staffAssignments: { none: {} } },
      { staffAssignments: { some: { user: { OR: [{ name: null }, { name: "" }] } } } },
    ];
  } else if (staff) {
    where.staffAssignments = { some: { user: { name: { equals: staff, mode: "insensitive" } } } };
  }
  if (filters.serviceId) where.serviceId = filters.serviceId;
  const status = filters.status || "all";
  if (status === "confirmed" || status === "completed" || status === "cancelled") {
    where.status = status;
  } else if (status === "tbd") {
    where.scheduleTimeTbd = true;
    where.status = { notIn: [...PRIVATE_STATUSES] };
  } else if (status === "scheduled") {
    where.scheduleTimeTbd = false;
    where.status = { notIn: [...PRIVATE_STATUSES, "completed", "cancelled"] };
  } else {
    where.status = { notIn: [...PRIVATE_STATUSES] };
  }
  const q = filters.q.trim();
  if (q.length >= 2) {
    andWhere(where, {
      OR: [
        { caseNumber: { contains: q, mode: "insensitive" } },
        { province: { contains: q, mode: "insensitive" } },
        { otherServiceName: { contains: q, mode: "insensitive" } },
        { service: { is: { name: { contains: q, mode: "insensitive" } } } },
        { staffAssignments: { some: { user: { name: { contains: q, mode: "insensitive" } } } } },
      ],
    });
  }
  return where;
}

export function staffManualWhere(start: Date, end: Date, filters: CalendarFilters): Prisma.EventWhereInput {
  const status = filters.status || "all";
  if (status === "confirmed" || status === "completed" || status === "cancelled") return { id: { in: [] } };
  const where: Prisma.EventWhereInput = {
    primaryForCaseId: null,
    caseId: null,
    start: { lt: end },
    end: { gt: start },
  };
  if (filters.provinces.length > 0) {
    const names = filters.provinces.filter(Boolean);
    const missing = filters.provinces.includes("");
    const clause: Prisma.EventWhereInput =
      missing && names.length > 0
        ? { OR: [{ province: { in: names } }, { province: null }] }
        : missing
          ? { province: null }
          : { province: { in: names } };
    const current = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    where.AND = [...current, clause];
  }
  const staff = filters.staffId.trim();
  if (staff === "tbd") where.staffId = null;
  else if (staff) where.staff = { is: { name: { equals: staff, mode: "insensitive" } } };
  if (filters.serviceId) where.serviceId = filters.serviceId;
  if (status === "tbd") where.allDay = true;
  if (status === "scheduled") where.allDay = false;
  const q = filters.q.trim();
  if (q.length >= 2) {
    const current = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    where.AND = [
      ...current,
      {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { province: { contains: q, mode: "insensitive" } },
          { otherServiceName: { contains: q, mode: "insensitive" } },
          { service: { is: { name: { contains: q, mode: "insensitive" } } } },
          { staff: { is: { name: { contains: q, mode: "insensitive" } } } },
        ],
      },
    ];
  }
  return where;
}

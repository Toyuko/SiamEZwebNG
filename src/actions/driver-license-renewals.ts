"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createDriverLicenseRenewal,
  getDriverLicenseRenewalStats,
  sendDriverLicenseReminder,
  sendDriverLicenseTestReminder,
  setDriverLicenseRenewalStatus,
  updateDriverLicenseRenewal,
} from "@/lib/driver-license-renewal/service";
import {
  parseDateOnly,
  todayInBangkok,
  toUtcDateOnly,
} from "@/lib/driver-license-renewal/dates";
import type {
  DriverLicenseFollowUpStatus,
  DriverLicenseRenewalType,
  Prisma,
} from "@prisma/client";

async function ensureStaffSession() {
  const session = await getSession();
  if (!session || (session.user.role !== "admin" && session.user.role !== "staff")) {
    throw new Error("Unauthorized");
  }
  return session;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export type RenewalListFilters = {
  status?: DriverLicenseFollowUpStatus | "all" | "due_soon";
  range?: "7d" | "30d" | "90d" | "6m" | "custom";
  from?: string;
  to?: string;
  search?: string;
  sort?: "renewal" | "reminder" | "customer" | "status";
  sortDir?: "asc" | "desc";
  page?: number;
};

const PAGE_SIZE = 25;

export async function listDriverLicenseRenewals(filters: RenewalListFilters = {}) {
  await ensureStaffSession();
  const page = Math.max(1, filters.page ?? 1);
  const today = toUtcDateOnly(todayInBangkok());

  const where: Prisma.DriverLicenseRenewalWhereInput = {};
  const and: Prisma.DriverLicenseRenewalWhereInput[] = [];

  if (filters.status && filters.status !== "all") {
    if (filters.status === "due_soon") {
      and.push({
        nextRenewalDate: { gte: today, lte: addDays(today, 30) },
        status: { in: ["UPCOMING", "REMINDER_DUE", "REMINDER_SENT", "CONTACTED"] },
      });
    } else if (filters.status === "REMINDER_DUE") {
      and.push({
        OR: [
          { status: "REMINDER_DUE" },
          {
            status: "UPCOMING",
            reminderSentAt: null,
            reminderDate: { lte: today },
          },
        ],
      });
    } else {
      and.push({ status: filters.status });
    }
  }

  if (filters.range || filters.from || filters.to) {
    const range = filters.range ?? "custom";
    let from = today;
    let to: Date | undefined;

    if (range === "7d") to = addDays(today, 7);
    else if (range === "30d") to = addDays(today, 30);
    else if (range === "90d") to = addDays(today, 90);
    else if (range === "6m") to = addDays(today, 182);
    else {
      if (filters.from) from = toUtcDateOnly(parseDateOnly(filters.from));
      if (filters.to) to = toUtcDateOnly(parseDateOnly(filters.to));
    }

    and.push({
      nextRenewalDate: {
        gte: from,
        ...(to ? { lte: to } : {}),
      },
    });
  }

  if (filters.search?.trim()) {
    const q = filters.search.trim();
    and.push({
      OR: [
        { client: { name: { contains: q, mode: "insensitive" } } },
        { client: { email: { contains: q, mode: "insensitive" } } },
        { client: { phone: { contains: q, mode: "insensitive" } } },
        { case: { caseNumber: { contains: q, mode: "insensitive" } } },
      ],
    });
  }

  if (and.length) where.AND = and;

  const sort = filters.sort ?? "renewal";
  const sortDir = filters.sortDir ?? "asc";
  const orderBy: Prisma.DriverLicenseRenewalOrderByWithRelationInput =
    sort === "reminder"
      ? { reminderDate: sortDir }
      : sort === "customer"
        ? { client: { name: sortDir } }
        : sort === "status"
          ? { status: sortDir }
          : { nextRenewalDate: sortDir };

  const [rows, total, stats] = await Promise.all([
    prisma.driverLicenseRenewal.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        case: { select: { id: true, caseNumber: true } },
        assignedStaff: { select: { id: true, name: true, email: true } },
      },
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.driverLicenseRenewal.count({ where }),
    getDriverLicenseRenewalStats(),
  ]);

  return {
    renewals: rows,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    stats,
  };
}

export async function getDriverLicenseRenewalById(id: string) {
  await ensureStaffSession();
  return prisma.driverLicenseRenewal.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, email: true, phone: true } },
      case: {
        select: {
          id: true,
          caseNumber: true,
          service: { select: { slug: true, name: true } },
        },
      },
      assignedStaff: { select: { id: true, name: true, email: true } },
      reminderSentBy: { select: { id: true, name: true, email: true } },
      activities: {
        include: { actor: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
}

export async function getClientDriverLicenseRenewals(clientId: string) {
  await ensureStaffSession();
  return prisma.driverLicenseRenewal.findMany({
    where: { clientId },
    include: {
      case: { select: { id: true, caseNumber: true } },
      assignedStaff: { select: { id: true, name: true, email: true } },
    },
    orderBy: { issueDate: "desc" },
  });
}

/** Portal: customer may only see their own renewals (no internal notes). */
export async function getMyDriverLicenseRenewals() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  if (session.user.role !== "customer") return [];

  return prisma.driverLicenseRenewal.findMany({
    where: {
      clientId: session.user.id,
      status: { notIn: ["CANCELLED", "NOT_INTERESTED"] },
    },
    select: {
      id: true,
      renewalType: true,
      issueDate: true,
      expiryDate: true,
      nextRenewalDate: true,
      status: true,
    },
    orderBy: { expiryDate: "desc" },
  });
}

export async function createRenewalAction(data: {
  clientId: string;
  caseId?: string | null;
  renewalType: DriverLicenseRenewalType;
  previousLicenseType?: string | null;
  issueDate: string;
  expiryDate?: string | null;
  notes?: string | null;
  assignedStaffId?: string | null;
}) {
  const session = await ensureStaffSession();
  try {
    const renewal = await createDriverLicenseRenewal({
      ...data,
      actorId: session.user.id,
      assignedStaffId: data.assignedStaffId ?? session.user.id,
    });
    return { ok: true as const, id: renewal.id };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Failed to create renewal",
    };
  }
}

export async function updateRenewalAction(
  id: string,
  data: {
    renewalType?: DriverLicenseRenewalType;
    previousLicenseType?: string | null;
    issueDate?: string;
    expiryDate?: string | null;
    notes?: string | null;
    assignedStaffId?: string | null;
    nextRenewalDate?: string;
    reminderDate?: string;
  }
) {
  const session = await ensureStaffSession();
  try {
    await updateDriverLicenseRenewal(id, { ...data, actorId: session.user.id });
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Failed to update renewal",
    };
  }
}

export async function setRenewalStatusAction(
  id: string,
  status: DriverLicenseFollowUpStatus,
  notes?: string | null
) {
  const session = await ensureStaffSession();
  try {
    await setDriverLicenseRenewalStatus({
      id,
      status,
      notes,
      actorId: session.user.id,
    });
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Failed to update status",
    };
  }
}

export async function sendRenewalReminderAction(id: string) {
  const session = await ensureStaffSession();
  const result = await sendDriverLicenseReminder({
    renewalId: id,
    method: "MANUAL",
    actorId: session.user.id,
  });
  if (result.ok) return { ok: true as const };
  return {
    ok: false as const,
    error: result.reason,
  };
}

export async function sendRenewalTestReminderAction(id: string) {
  const session = await ensureStaffSession();
  const result = await sendDriverLicenseTestReminder({
    renewalId: id,
    actorId: session.user.id,
  });
  if (result.ok) return { ok: true as const };
  return {
    ok: false as const,
    error: result.reason,
  };
}

export async function getDriverLicenseDashboardStats() {
  await ensureStaffSession();
  return getDriverLicenseRenewalStats();
}

/** Resolve client id for a case (registered user or match guest email). */
export async function resolveClientIdForCase(caseId: string): Promise<string | null> {
  await ensureStaffSession();
  const c = await prisma.case.findUnique({
    where: { id: caseId },
    select: { userId: true, guestEmail: true },
  });
  if (!c) return null;
  if (c.userId) return c.userId;
  if (c.guestEmail?.trim()) {
    const user = await prisma.user.findUnique({
      where: { email: c.guestEmail.trim().toLowerCase() },
      select: { id: true, role: true },
    });
    if (user?.role === "customer") return user.id;
  }
  return null;
}

import { prisma } from "@/lib/db";
import {
  addCalendarDays,
  endOfMonthParts,
  endOfWeekBangkok,
  parseDateOnly,
  startOfWeekBangkok,
  todayInBangkok,
  toUtcDateOnly,
} from "@/lib/follow-ups/dates";
import { OPEN_FOLLOW_UP_STATUSES } from "@/lib/follow-ups/constants";
import { followUpInclude } from "@/lib/follow-ups/service";
import type {
  FollowUpPriority,
  FollowUpReminderStatus,
  FollowUpStatus,
  FollowUpType,
  Prisma,
} from "@prisma/client";

export type FollowUpListFilters = {
  search?: string;
  serviceId?: string;
  followUpType?: FollowUpType | "all";
  status?: FollowUpStatus | "all";
  priority?: FollowUpPriority | "all";
  assignedStaffId?: string | "me" | "all" | "unassigned";
  reminderStatus?: FollowUpReminderStatus | "all";
  dueFrom?: string;
  dueTo?: string;
  clientId?: string;
  caseId?: string;
  /** Summary buckets */
  bucket?:
    | "due_today"
    | "overdue"
    | "due_week"
    | "due_month"
    | "high_priority"
    | "assigned_to_me"
    | "completed"
    | "upcoming"
    | "all";
  currentStaffId?: string;
  page?: number;
  pageSize?: number;
};

function buildWhere(
  filters: FollowUpListFilters,
  now: Date = new Date()
): Prisma.FollowUpWhereInput {
  const today = todayInBangkok(now);
  const todayUtc = toUtcDateOnly(today);
  const weekEnd = toUtcDateOnly(endOfWeekBangkok(now));
  const monthEnd = toUtcDateOnly(endOfMonthParts(today));

  const where: Prisma.FollowUpWhereInput = {};

  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.caseId) where.caseId = filters.caseId;
  if (filters.serviceId) where.serviceId = filters.serviceId;
  if (filters.followUpType && filters.followUpType !== "all") {
    where.followUpType = filters.followUpType;
  }
  if (filters.status && filters.status !== "all") {
    where.status = filters.status;
  }
  if (filters.priority && filters.priority !== "all") {
    where.priority = filters.priority;
  }
  if (filters.reminderStatus && filters.reminderStatus !== "all") {
    where.reminderStatus = filters.reminderStatus;
  }

  if (filters.assignedStaffId === "me" && filters.currentStaffId) {
    where.assignedStaffId = filters.currentStaffId;
  } else if (filters.assignedStaffId === "unassigned") {
    where.assignedStaffId = null;
  } else if (
    filters.assignedStaffId &&
    filters.assignedStaffId !== "all" &&
    filters.assignedStaffId !== "me"
  ) {
    where.assignedStaffId = filters.assignedStaffId;
  }

  if (filters.dueFrom || filters.dueTo) {
    where.dueDate = {};
    if (filters.dueFrom) where.dueDate.gte = toUtcDateOnly(parseDateOnly(filters.dueFrom));
    if (filters.dueTo) where.dueDate.lte = toUtcDateOnly(parseDateOnly(filters.dueTo));
  }

  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { client: { name: { contains: q, mode: "insensitive" } } },
      { client: { email: { contains: q, mode: "insensitive" } } },
      { client: { phone: { contains: q, mode: "insensitive" } } },
      { case: { caseNumber: { contains: q, mode: "insensitive" } } },
    ];
  }

  switch (filters.bucket) {
    case "due_today":
      where.status = { in: OPEN_FOLLOW_UP_STATUSES };
      where.dueDate = todayUtc;
      break;
    case "overdue":
      where.status = { in: ["PENDING", "DUE", "IN_PROGRESS", "SNOOZED"] };
      where.dueDate = { lt: todayUtc };
      break;
    case "due_week":
      where.status = { in: OPEN_FOLLOW_UP_STATUSES };
      where.dueDate = {
        gte: toUtcDateOnly(startOfWeekBangkok(now)),
        lte: weekEnd,
      };
      break;
    case "due_month":
      where.status = { in: OPEN_FOLLOW_UP_STATUSES };
      where.dueDate = {
        gte: toUtcDateOnly({ year: today.year, month: today.month, day: 1 }),
        lte: monthEnd,
      };
      break;
    case "high_priority":
      where.status = { in: OPEN_FOLLOW_UP_STATUSES };
      where.priority = { in: ["HIGH", "URGENT"] };
      break;
    case "assigned_to_me":
      if (filters.currentStaffId) {
        where.assignedStaffId = filters.currentStaffId;
        where.status = { in: OPEN_FOLLOW_UP_STATUSES };
      }
      break;
    case "completed":
      where.status = "COMPLETED";
      break;
    case "upcoming":
      where.status = { in: ["PENDING", "SNOOZED"] };
      where.dueDate = { gt: todayUtc };
      break;
    default:
      break;
  }

  return where;
}

export async function listFollowUps(filters: FollowUpListFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const where = buildWhere(filters);

  const [items, total] = await Promise.all([
    prisma.followUp.findMany({
      where,
      include: followUpInclude,
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.followUp.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getFollowUpById(id: string) {
  return prisma.followUp.findUnique({
    where: { id },
    include: {
      ...followUpInclude,
      activities: {
        orderBy: { createdAt: "desc" },
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
}

export async function getFollowUpStats(input?: {
  currentStaffId?: string;
  now?: Date;
}) {
  const now = input?.now ?? new Date();
  const today = todayInBangkok(now);
  const todayUtc = toUtcDateOnly(today);
  const weekEnd = toUtcDateOnly(endOfWeekBangkok(now));
  const monthEnd = toUtcDateOnly(endOfMonthParts(today));
  const open = { status: { in: OPEN_FOLLOW_UP_STATUSES } };

  const [
    total,
    completed,
    cancelled,
    overdue,
    dueToday,
    dueWeek,
    dueMonth,
    highPriority,
    assignedToMe,
    upcoming,
    emailsSent,
    emailsFailed,
  ] = await Promise.all([
    prisma.followUp.count(),
    prisma.followUp.count({ where: { status: "COMPLETED" } }),
    prisma.followUp.count({ where: { status: "CANCELLED" } }),
    prisma.followUp.count({
      where: {
        ...open,
        dueDate: { lt: todayUtc },
      },
    }),
    prisma.followUp.count({
      where: { ...open, dueDate: todayUtc },
    }),
    prisma.followUp.count({
      where: {
        ...open,
        dueDate: {
          gte: toUtcDateOnly(startOfWeekBangkok(now)),
          lte: weekEnd,
        },
      },
    }),
    prisma.followUp.count({
      where: {
        ...open,
        dueDate: {
          gte: toUtcDateOnly({ year: today.year, month: today.month, day: 1 }),
          lte: monthEnd,
        },
      },
    }),
    prisma.followUp.count({
      where: {
        ...open,
        priority: { in: ["HIGH", "URGENT"] },
      },
    }),
    input?.currentStaffId
      ? prisma.followUp.count({
          where: {
            ...open,
            assignedStaffId: input.currentStaffId,
          },
        })
      : Promise.resolve(0),
    prisma.followUp.count({
      where: {
        status: { in: ["PENDING", "SNOOZED"] },
        dueDate: { gt: todayUtc },
      },
    }),
    prisma.followUp.count({ where: { reminderStatus: "SENT" } }),
    prisma.followUp.count({ where: { reminderStatus: "FAILED" } }),
  ]);

  const completionRate =
    total === 0 ? 0 : Math.round((completed / Math.max(1, completed + cancelled + overdue)) * 1000) / 10;

  const [byService, byStaff] = await Promise.all([
    prisma.followUp.groupBy({
      by: ["serviceId"],
      _count: { _all: true },
      orderBy: { _count: { serviceId: "desc" } },
      take: 20,
    }),
    prisma.followUp.groupBy({
      by: ["assignedStaffId"],
      _count: { _all: true },
      where: { assignedStaffId: { not: null } },
      orderBy: { _count: { assignedStaffId: "desc" } },
      take: 20,
    }),
  ]);

  const serviceIds = byService.map((s) => s.serviceId).filter(Boolean) as string[];
  const staffIds = byStaff.map((s) => s.assignedStaffId).filter(Boolean) as string[];

  const [services, staff] = await Promise.all([
    serviceIds.length
      ? prisma.service.findMany({
          where: { id: { in: serviceIds } },
          select: { id: true, name: true, slug: true },
        })
      : Promise.resolve([]),
    staffIds.length
      ? prisma.user.findMany({
          where: { id: { in: staffIds } },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
  ]);

  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]));
  const staffMap = Object.fromEntries(staff.map((s) => [s.id, s]));

  return {
    total,
    completed,
    cancelled,
    overdue,
    dueToday,
    dueWeek,
    dueMonth,
    highPriority,
    assignedToMe,
    upcoming,
    emailsSent,
    emailsFailed,
    completionRate,
    byService: byService.map((row) => ({
      serviceId: row.serviceId,
      count: row._count._all,
      service: row.serviceId ? serviceMap[row.serviceId] ?? null : null,
    })),
    byStaff: byStaff.map((row) => ({
      staffId: row.assignedStaffId,
      count: row._count._all,
      staff: row.assignedStaffId ? staffMap[row.assignedStaffId] ?? null : null,
    })),
  };
}

export async function getFollowUpsForCalendar(input: {
  from: string;
  to: string;
  assignedStaffId?: string;
}) {
  const from = toUtcDateOnly(parseDateOnly(input.from));
  const to = toUtcDateOnly(parseDateOnly(input.to));

  return prisma.followUp.findMany({
    where: {
      dueDate: { gte: from, lte: to },
      status: { not: "CANCELLED" },
      ...(input.assignedStaffId ? { assignedStaffId: input.assignedStaffId } : {}),
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      service: { select: { id: true, name: true, slug: true } },
      assignedStaff: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: "asc" },
  });
}

export async function getClientFollowUpGroups(clientId: string) {
  const items = await prisma.followUp.findMany({
    where: { clientId },
    include: followUpInclude,
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  const today = todayInBangkok();
  const todayUtc = toUtcDateOnly(today);

  return {
    upcoming: items.filter(
      (f) =>
        OPEN_FOLLOW_UP_STATUSES.includes(f.status) &&
        f.dueDate.getTime() >= todayUtc.getTime()
    ),
    overdue: items.filter(
      (f) =>
        OPEN_FOLLOW_UP_STATUSES.includes(f.status) &&
        f.dueDate.getTime() < todayUtc.getTime()
    ),
    completed: items.filter((f) => f.status === "COMPLETED"),
    cancelled: items.filter((f) => f.status === "CANCELLED"),
    all: items,
  };
}

export async function syncOverdueStatuses(now: Date = new Date()) {
  const todayUtc = toUtcDateOnly(todayInBangkok(now));
  return prisma.followUp.updateMany({
    where: {
      status: { in: ["PENDING", "SNOOZED"] },
      dueDate: { lte: todayUtc },
    },
    data: { status: "DUE" },
  });
}

export { addCalendarDays };

import { Prisma, type CaseStatus } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { paymentStanding, caseServiceName, parseDocumentsRequired } from "@/lib/jobs/intake";
import {
  deriveWorkActions,
  isWorkCenterTab,
  workCenterTabWhere,
  type WorkActionHint,
  type WorkCenterTab,
} from "@/lib/admin/work-center";

const listInclude = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  service: { select: { id: true, name: true } },
  salesPerson: { select: { id: true, name: true, email: true } },
  staffAssignments: {
    take: 3,
    orderBy: { assignedAt: "asc" as const },
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  invoices: {
    take: 1,
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      amount: true,
      depositAmount: true,
      status: true,
      payments: {
        where: { status: "approved" as const },
        select: { amount: true, status: true },
      },
    },
  },
} satisfies Prisma.CaseInclude;

type ListRow = Prisma.CaseGetPayload<{ include: typeof listInclude }>;

export type WorkCenterItem = {
  id: string;
  caseNumber: string;
  status: CaseStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  paymentStatus: "unpaid" | "partial" | "paid";
  outstandingSatang: number;
  paidSatang: number;
  totalSatang: number;
  assignedStaff: { id: string; name: string | null; email: string } | null;
  updatedAt: string;
  createdAt: string;
  scheduledAt: string | null;
  actions: WorkActionHint[];
  primaryAction: string | null;
};

function toWorkItem(row: ListRow, now: Date): WorkCenterItem {
  const invoice = row.invoices[0] ?? null;
  const paidSatang =
    invoice?.payments.reduce((sum, p) => sum + p.amount, 0) ??
    0;
  const totalSatang = invoice?.amount ?? row.dealValue ?? 0;
  const outstandingSatang = Math.max(0, totalSatang - paidSatang);
  const paymentStatus = paymentStanding(totalSatang, paidSatang);
  const assigned = row.staffAssignments[0]?.user ?? null;
  const documents = parseDocumentsRequired(row.documentsRequired);
  const actions = deriveWorkActions({
    status: row.status,
    assignedStaffId: assigned?.id ?? null,
    scheduledAt: row.scheduledAt,
    outstandingSatang,
    paymentStatus,
    documentsRequired: documents,
    now,
  });

  return {
    id: row.id,
    caseNumber: row.caseNumber,
    status: row.status,
    customerName: row.user?.name ?? row.guestName ?? "Customer",
    customerEmail: row.user?.email ?? row.guestEmail ?? "",
    customerPhone: row.user?.phone ?? row.guestPhone ?? "",
    serviceName: caseServiceName(row),
    paymentStatus,
    outstandingSatang,
    paidSatang,
    totalSatang,
    assignedStaff: assigned,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    actions,
    primaryAction: actions[0]?.label ?? null,
  };
}

function buildWhere(filters: {
  tab: WorkCenterTab;
  search?: string;
  staffId?: string;
  serviceId?: string;
  paymentStatus?: "unpaid" | "partial" | "paid" | "all";
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  now: Date;
}): Prisma.CaseWhereInput {
  const parts: Prisma.CaseWhereInput[] = [workCenterTabWhere(filters.tab, filters.now)];

  if (filters.staffId && filters.staffId !== "all") {
    parts.push({ staffAssignments: { some: { userId: filters.staffId } } });
  }
  if (filters.serviceId && filters.serviceId !== "all") {
    if (filters.serviceId === "other") parts.push({ serviceId: null });
    else parts.push({ serviceId: filters.serviceId });
  }
  if (filters.source && filters.source !== "all") {
    parts.push({ leadSource: filters.source });
  }
  if (filters.dateFrom || filters.dateTo) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.dateFrom) createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    parts.push({ createdAt });
  }

  const q = filters.search?.trim();
  if (q) {
    parts.push({
      OR: [
        { caseNumber: { contains: q, mode: "insensitive" } },
        { id: q },
        { guestName: { contains: q, mode: "insensitive" } },
        { guestEmail: { contains: q, mode: "insensitive" } },
        { guestPhone: { contains: q, mode: "insensitive" } },
        { otherServiceName: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { user: { phone: { contains: q, mode: "insensitive" } } },
      ],
    });
  }

  if (filters.paymentStatus === "unpaid") {
    parts.push({ payments: { none: { status: "approved" } } });
  }

  return parts.length === 1 ? parts[0]! : { AND: parts };
}

export async function listWorkCenter(filters: {
  tab?: string;
  search?: string;
  staffId?: string;
  serviceId?: string;
  paymentStatus?: "unpaid" | "partial" | "paid" | "all";
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  now?: Date;
}) {
  const now = filters.now ?? new Date();
  const tab: WorkCenterTab = isWorkCenterTab(filters.tab) ? filters.tab : "all";
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, filters.pageSize ?? 20));
  const where = buildWhere({
    tab,
    search: filters.search,
    staffId: filters.staffId,
    serviceId: filters.serviceId,
    paymentStatus: filters.paymentStatus ?? "all",
    source: filters.source,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    now,
  });

  const needsPaymentScan =
    filters.paymentStatus === "partial" || filters.paymentStatus === "paid";

  const orderBy: Prisma.CaseOrderByWithRelationInput[] = [
    { updatedAt: "desc" },
  ];

  if (needsPaymentScan) {
    const rows = await prisma.case.findMany({
      where,
      include: listInclude,
      orderBy,
      take: 400,
    });
    let items = rows.map((row) => toWorkItem(row, now));
    items = items.filter((item) => item.paymentStatus === filters.paymentStatus);
    const total = items.length;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return {
      items: paged,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      tab,
    };
  }

  const [rows, total] = await Promise.all([
    prisma.case.findMany({
      where,
      include: listInclude,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.case.count({ where }),
  ]);

  return {
    items: rows.map((row) => toWorkItem(row, now)),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    tab,
  };
}

/** Cheap operational counts for dashboard / Work Center header (no full scans). */
async function loadWorkCenterSnapshot(now = new Date()) {
  // Bangkok calendar day bounds in UTC
  const bangkokParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = Number(bangkokParts.find((p) => p.type === "year")?.value);
  const m = Number(bangkokParts.find((p) => p.type === "month")?.value);
  const d = Number(bangkokParts.find((p) => p.type === "day")?.value);
  const todayStart = new Date(Date.UTC(y, m - 1, d, -7, 0, 0, 0)); // UTC+7 midnight
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const [active, needsAction, awaitingPayment, todayAppointments] = await Promise.all([
    prisma.case.count({
      where: { status: { notIn: ["completed", "cancelled", "refunded"] } },
    }),
    prisma.case.count({ where: workCenterTabWhere("needs_action", now) }),
    prisma.case.count({ where: workCenterTabWhere("awaiting_payment", now) }),
    prisma.case.count({
      where: {
        status: { notIn: ["completed", "cancelled", "refunded"] },
        scheduledAt: { gte: todayStart, lt: todayEnd },
      },
    }),
  ]);

  return { active, needsAction, awaitingPayment, todayAppointments };
}

/** Short-lived cache for dashboard/work-center metric chips. */
export const getWorkCenterSnapshot = unstable_cache(
  async () => loadWorkCenterSnapshot(),
  ["admin-work-center-snapshot"],
  { revalidate: 30, tags: ["admin-dashboard", "admin-work-center"] }
);

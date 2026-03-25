"use server";

import { prisma } from "@/lib/db";
import { nextCaseNumber } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import { getPaymentSettings, savePaymentSettings, type PaymentSettings } from "@/lib/payment-settings";
import type {
  CaseStatus,
  InvoiceStatus,
  ServiceType,
  UserRole,
  EventType,
  PaymentMethod,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const ITEMS_PER_PAGE = 20;

async function ensureStaffAccess() {
  const session = await getSession();
  if (!session || (session.user.role !== "admin" && session.user.role !== "staff")) {
    throw new Error("Unauthorized");
  }
}

// ----- Dashboard -----

export async function getAdminStats() {
  const [openCases, totalClients, paidPayments, pendingInvoices, pendingPayments] =
    await Promise.all([
      prisma.case.count({ where: { status: { notIn: ["completed", "cancelled"] as CaseStatus[] } } }),
      prisma.user.count({ where: { role: "customer" } }),
      prisma.payment.aggregate({ where: { status: "approved" }, _sum: { amount: true } }),
      prisma.invoice.count({
        where: { status: { in: ["unpaid", "pending_verification", "draft"] as InvoiceStatus[] } },
      }),
      prisma.payment.count({ where: { status: "submitted" } }),
    ]);
  return {
    openCases,
    totalClients,
    revenue: paidPayments._sum.amount ?? 0,
    pendingInvoices,
    pendingPayments,
  };
}

export async function getRecentActivity() {
  const [recentCases, recentPayments] = await Promise.all([
    prisma.case.findMany({
      take: 5,
      include: {
        user: { select: { name: true, email: true } },
        service: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      take: 5,
      include: {
        invoice: {
          include: {
            case: { select: { id: true, caseNumber: true, guestName: true, guestEmail: true } },
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    }),
  ]);
  return { recentCases, recentPayments };
}

// ----- Clients -----

export async function getClients(options?: { search?: string; page?: number }) {
  const page = options?.page ?? 1;
  const skip = (page - 1) * ITEMS_PER_PAGE;
  const where = options?.search
    ? {
        role: "customer" as const,
        OR: [
          { name: { contains: options.search } },
          { email: { contains: options.search } },
        ],
      }
    : { role: "customer" as const };

  const [clients, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, phone: true, active: true, createdAt: true },
      orderBy: { name: "asc" },
      skip,
      take: ITEMS_PER_PAGE,
    }),
    prisma.user.count({ where }),
  ]);
  return { clients, total, page, totalPages: Math.ceil(total / ITEMS_PER_PAGE) };
}

export async function getClientById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      casesAsClient: { include: { service: true } },
      invoices: { include: { case: { select: { caseNumber: true } } } },
      documents: true,
    },
  });
}

export async function createClient(data: {
  email: string;
  name?: string | null;
  phone?: string | null;
  password?: string;
}) {
  const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : null;
  return prisma.user.create({
    data: {
      email: data.email,
      name: data.name ?? null,
      phone: data.phone ?? null,
      role: "customer",
      passwordHash,
    },
  });
}

export async function updateClient(
  id: string,
  data: { email?: string; name?: string | null; phone?: string | null; active?: boolean }
) {
  return prisma.user.update({ where: { id }, data });
}

export async function deactivateClient(id: string) {
  return prisma.user.update({ where: { id }, data: { active: false } });
}

// ----- Services -----

export async function getServices(options?: { search?: string }) {
  const where = options?.search
    ? {
        OR: [
          { name: { contains: options.search } },
          { slug: { contains: options.search } },
        ],
      }
    : {};

  return prisma.service.findMany({
    where,
    orderBy: { sortOrder: "asc" },
  });
}

export async function getServiceById(id: string) {
  return prisma.service.findUnique({ where: { id } });
}

export async function createService(data: {
  slug: string;
  name: string;
  shortDescription?: string | null;
  description: string;
  type: ServiceType;
  priceAmount?: number | null;
  sortOrder?: number;
  active?: boolean;
}) {
  const slug = data.slug.toLowerCase().replace(/\s+/g, "-");
  return prisma.service.create({
    data: {
      ...data,
      slug,
      sortOrder: data.sortOrder ?? 0,
      active: data.active ?? true,
    },
  });
}

export async function updateService(
  id: string,
  data: {
    slug?: string;
    name?: string;
    shortDescription?: string | null;
    description?: string;
    type?: ServiceType;
    priceAmount?: number | null;
    sortOrder?: number;
    active?: boolean;
  }
) {
  if (data.slug) data.slug = data.slug.toLowerCase().replace(/\s+/g, "-");
  return prisma.service.update({ where: { id }, data });
}

export async function deleteService(id: string) {
  return prisma.service.delete({ where: { id } });
}

// ----- Cases -----

export async function getCases(options?: {
  status?: CaseStatus | "all";
  serviceId?: string;
  search?: string;
  page?: number;
}) {
  const page = options?.page ?? 1;
  const skip = (page - 1) * ITEMS_PER_PAGE;

  const where: Record<string, unknown> = {};
  if (options?.status && options.status !== "all") where.status = options.status;
  else where.status = { notIn: ["completed", "cancelled"] as CaseStatus[] };
  if (options?.serviceId) where.serviceId = options.serviceId;
  if (options?.search) {
    where.OR = [
      { caseNumber: { contains: options.search } },
      { user: { name: { contains: options.search } } },
      { user: { email: { contains: options.search } } },
      { guestName: { contains: options.search } },
      { guestEmail: { contains: options.search } },
    ];
  }

  const [cases, total] = await Promise.all([
    prisma.case.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        service: { select: { id: true, name: true, slug: true, type: true } },
        staffAssignments: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: ITEMS_PER_PAGE,
    }),
    prisma.case.count({ where }),
  ]);
  return { cases, total, page, totalPages: Math.ceil(total / ITEMS_PER_PAGE) };
}

/** Recent cases for admin dropdowns (e.g. document upload). */
export async function getCaseSelectOptions() {
  return prisma.case.findMany({
    select: { id: true, caseNumber: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}

export async function getCaseById(id: string) {
  return prisma.case.findUnique({
    where: { id },
    include: {
      user: true,
      service: true,
      staffAssignments: { include: { user: true } },
      caseNotes: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
      documents: true,
      payments: { orderBy: { createdAt: "desc" } },
      invoices: { include: { quote: true }, orderBy: { createdAt: "desc" } },
      quotes: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function updateCase(id: string, data: Partial<{ status: CaseStatus; userId: string; guestName: string | null; guestEmail: string | null; guestPhone: string | null }>) {
  return prisma.case.update({ where: { id }, data });
}

export async function assignStaff(caseId: string, userId: string, role: string = "support") {
  return prisma.staffAssignment.upsert({
    where: { caseId_userId: { caseId, userId } },
    create: { caseId, userId, role },
    update: { role },
  });
}

export async function removeStaffAssignment(caseId: string, userId: string) {
  return prisma.staffAssignment.delete({
    where: { caseId_userId: { caseId, userId } },
  });
}

export async function addCaseNote(caseId: string, userId: string, content: string, isInternal = true) {
  return prisma.caseNote.create({ data: { caseId, userId, content, isInternal } });
}

// ----- Invoices -----

export async function getInvoices(options?: { status?: InvoiceStatus | "all"; page?: number }) {
  const page = options?.page ?? 1;
  const skip = (page - 1) * ITEMS_PER_PAGE;
  const where =
    options?.status && options.status !== "all"
      ? { status: options.status }
      : {};

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        case: { select: { id: true, caseNumber: true, guestName: true, guestEmail: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: ITEMS_PER_PAGE,
    }),
    prisma.invoice.count({ where }),
  ]);
  return { invoices, total, page, totalPages: Math.ceil(total / ITEMS_PER_PAGE) };
}

export async function getInvoiceById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      case: { include: { service: true, user: true } },
      quote: true,
      user: true,
      payments: true,
    },
  });
}

export async function createInvoice(data: {
  caseId: string;
  userId?: string | null;
  amount: number;
  currency?: string;
  dueDate?: Date | null;
}) {
  return prisma.invoice.create({
    data: {
      caseId: data.caseId,
      userId: data.userId ?? undefined,
      amount: data.amount,
      currency: data.currency ?? "THB",
      status: "draft",
      dueDate: data.dueDate ?? undefined,
    },
  });
}

export async function updateInvoice(
  id: string,
  data: {
    amount?: number;
    status?: InvoiceStatus;
    dueDate?: Date | string | null;
    clientAddress?: string | null;
  }
) {
  const dueDate =
    data.dueDate === undefined
      ? undefined
      : data.dueDate === null
        ? null
        : typeof data.dueDate === "string"
          ? new Date(data.dueDate)
          : data.dueDate;

  return prisma.invoice.update({
    where: { id },
    data: {
      ...(data.amount !== undefined ? { amount: data.amount } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(dueDate !== undefined ? { dueDate: dueDate ?? undefined } : {}),
      ...(data.clientAddress !== undefined ? { clientAddress: data.clientAddress ?? undefined } : {}),
    },
  });
}

export async function deleteInvoice(id: string): Promise<{ success: boolean; error?: string }> {
  await ensureStaffAccess();
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!invoice) return { success: false, error: "Invoice not found" };

    const paymentCount = await prisma.payment.count({ where: { invoiceId: id } });
    if (paymentCount > 0) {
      return { success: false, error: "Cannot delete an invoice that has payments." };
    }

    await prisma.invoice.delete({ where: { id } });
    return { success: true };
  } catch (e) {
    console.error("deleteInvoice error", e);
    return { success: false, error: e instanceof Error ? e.message : "Failed to delete invoice" };
  }
}

// ----- Payments -----

/** Maps UI tab or legacy `status` query to Prisma PaymentStatus. */
function resolvePaymentStatusFilter(tab?: string, legacyStatus?: string) {
  const t = tab ?? legacyStatus;
  if (!t || t === "all") return undefined;
  if (t === "pending") return "submitted" as const;
  if (t === "paid") return "approved" as const;
  if (t === "failed") return "rejected" as const;
  if (t === "submitted" || t === "approved" || t === "rejected") return t;
  return undefined;
}

export async function getPaymentStats() {
  const [approvedSum, totalCount, pendingCount, paidCount] = await Promise.all([
    prisma.payment.aggregate({ where: { status: "approved" }, _sum: { amount: true } }),
    prisma.payment.count(),
    prisma.payment.count({ where: { status: "submitted" } }),
    prisma.payment.count({ where: { status: "approved" } }),
  ]);
  return {
    totalRevenue: approvedSum._sum.amount ?? 0,
    totalOrders: totalCount,
    pendingPayments: pendingCount,
    paidOrders: paidCount,
  };
}

export async function getPayments(options?: {
  tab?: string;
  /** @deprecated use tab=pending|paid|failed */
  status?: string;
  page?: number;
  q?: string;
  method?: string;
}) {
  const page = options?.page ?? 1;
  const skip = (page - 1) * ITEMS_PER_PAGE;

  const statusFilter = resolvePaymentStatusFilter(options?.tab, options?.status);

  const search = options?.q?.trim();
  const method = options?.method?.trim() || "all";

  const parts: Prisma.PaymentWhereInput[] = [];
  if (statusFilter) parts.push({ status: statusFilter });
  if (search) {
    parts.push({
      invoice: { case: { caseNumber: { contains: search } } },
    });
  }
  if (method === "manual") {
    parts.push({
      metadata: { equals: { manualEntry: true } as Prisma.InputJsonValue },
    });
  } else if (method !== "all") {
    parts.push({ method: method as PaymentMethod });
  }

  const where: Prisma.PaymentWhereInput =
    parts.length === 0 ? {} : parts.length === 1 ? parts[0]! : { AND: parts };

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        invoice: {
          include: {
            case: { include: { service: true } },
            user: true,
          },
        },
        proofDocument: true,
      },
      orderBy: { submittedAt: "desc" },
      skip,
      take: ITEMS_PER_PAGE,
    }),
    prisma.payment.count({ where }),
  ]);
  return { payments, total, page, totalPages: Math.ceil(total / ITEMS_PER_PAGE) };
}

export type InvoiceForManualPayment = {
  id: string;
  caseId: string;
  caseNumber: string;
  serviceName: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  clientName: string | null;
  clientEmail: string | null;
};

export async function getInvoicesForManualPayment(): Promise<InvoiceForManualPayment[]> {
  const rows = await prisma.invoice.findMany({
    where: {
      status: { in: ["draft", "unpaid", "pending_verification"] },
    },
    include: {
      case: { include: { service: true } },
      user: true,
    },
    orderBy: { createdAt: "desc" },
    take: 150,
  });
  return rows.map((inv) => {
    const guestName = inv.case.guestName;
    const guestEmail = inv.case.guestEmail;
    const userName = inv.user?.name;
    const userEmail = inv.user?.email;
    return {
      id: inv.id,
      caseId: inv.caseId,
      caseNumber: inv.case.caseNumber,
      serviceName: inv.case.service.name,
      amount: inv.amount,
      currency: inv.currency,
      status: inv.status,
      clientName: userName ?? guestName ?? null,
      clientEmail: userEmail ?? guestEmail ?? null,
    };
  });
}

export async function recordManualPayment(
  invoiceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || (session.user.role !== "admin" && session.user.role !== "staff")) {
      return { success: false, error: "Unauthorized" };
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { case: true },
    });
    if (!invoice) return { success: false, error: "Invoice not found" };
    if (invoice.status === "paid") return { success: false, error: "Invoice is already paid" };
    if (invoice.status === "rejected") {
      return { success: false, error: "Invoice was rejected" };
    }

    const existingApproved = await prisma.payment.findFirst({
      where: { invoiceId, status: "approved" },
    });
    if (existingApproved) {
      return { success: false, error: "This invoice already has an approved payment" };
    }

    const caseRow = invoice.case;
    const shouldAdvanceCase =
      caseRow.status !== "completed" && caseRow.status !== "cancelled";

    await prisma.$transaction([
      prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          caseId: invoice.caseId,
          amount: invoice.amount,
          currency: invoice.currency,
          method: "bank",
          status: "approved",
          approvedAt: new Date(),
          metadata: { manualEntry: true } as Prisma.InputJsonValue,
        },
      }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "paid",
          paidAt: new Date(),
          paymentMethod: "bank",
        },
      }),
      ...(shouldAdvanceCase
        ? [
            prisma.case.update({
              where: { id: invoice.caseId },
              data: { status: "in_progress" },
            }),
          ]
        : []),
    ]);

    return { success: true };
  } catch (e) {
    console.error("recordManualPayment", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to record payment",
    };
  }
}

export async function approvePayment(id: string) {
  const payment = await prisma.payment.update({
    where: { id },
    data: { status: "approved", approvedAt: new Date() },
    include: { invoice: true },
  });
  await prisma.invoice.update({
    where: { id: payment.invoiceId },
    data: { status: "paid", paidAt: new Date() },
  });
  await prisma.case.update({
    where: { id: payment.caseId },
    data: { status: "in_progress" },
  });
  return payment;
}

export async function rejectPayment(id: string) {
  const payment = await prisma.payment.update({
    where: { id },
    data: { status: "rejected" },
    include: { invoice: true },
  });
  await prisma.invoice.update({
    where: { id: payment.invoiceId },
    data: { status: "rejected" },
  });
  return payment;
}

// ----- Documents -----

export async function getDocuments(options?: {
  caseId?: string;
  documentType?: string;
  search?: string;
  page?: number;
}) {
  const page = options?.page ?? 1;
  const skip = (page - 1) * ITEMS_PER_PAGE;
  const where: Record<string, unknown> = {};
  if (options?.caseId) where.caseId = options.caseId;
  if (options?.documentType) where.documentType = options.documentType;
  if (options?.search) where.name = { contains: options.search };

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        case: { select: { id: true, caseNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: ITEMS_PER_PAGE,
    }),
    prisma.document.count({ where }),
  ]);
  return { documents, total, page, totalPages: Math.ceil(total / ITEMS_PER_PAGE) };
}

export async function createDocument(data: {
  caseId?: string | null;
  name: string;
  storageKey: string;
  mimeType?: string | null;
  size?: number | null;
  documentType?: string | null;
  uploadedBy?: string | null;
}) {
  return prisma.document.create({
    data: {
      caseId: data.caseId ?? null,
      name: data.name,
      storageKey: data.storageKey,
      mimeType: data.mimeType ?? undefined,
      size: data.size ?? undefined,
      documentType: data.documentType ?? undefined,
      uploadedBy: data.uploadedBy ?? undefined,
    },
  });
}

export async function deleteDocument(id: string) {
  return prisma.document.delete({ where: { id } });
}

export async function reassignDocument(id: string, caseId: string) {
  return prisma.document.update({ where: { id }, data: { caseId } });
}

/** Documents with no case yet (for attaching from case detail). */
export async function getUnassignedDocuments(limit = 150) {
  return prisma.document.findMany({
    where: { caseId: null },
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// ----- Staff -----

export async function getStaffUsersAdmin(options?: { search?: string }) {
  const where = options?.search
    ? {
        role: { in: ["admin", "staff"] as UserRole[] },
        OR: [
          { name: { contains: options.search } },
          { email: { contains: options.search } },
        ],
      }
    : { role: { in: ["admin", "staff"] as UserRole[] } };

  return prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true, active: true },
    orderBy: { name: "asc" },
  });
}

export async function createStaffUser(data: {
  email: string;
  name?: string | null;
  password: string;
  role: UserRole;
}) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  return prisma.user.create({
    data: {
      email: data.email,
      name: data.name ?? null,
      role: data.role,
      passwordHash,
    },
  });
}

export async function updateStaffUser(
  id: string,
  data: { name?: string | null; role?: UserRole; active?: boolean; password?: string }
) {
  const update: Record<string, unknown> = { name: data.name, role: data.role, active: data.active };
  if (data.password) update.passwordHash = await bcrypt.hash(data.password, 10);
  return prisma.user.update({ where: { id }, data: update });
}

// ----- Events (Calendar) -----

export async function getEvents(options?: { start?: Date; end?: Date; caseId?: string; staffId?: string }) {
  const where: Record<string, unknown> = {};
  if (options?.start && options?.end) {
    where.OR = [
      { start: { gte: options.start, lte: options.end } },
      { end: { gte: options.start, lte: options.end } },
    ];
  }
  if (options?.caseId) where.caseId = options.caseId;
  if (options?.staffId) where.staffId = options.staffId;

  return prisma.event.findMany({
    where,
    include: {
      case: { select: { caseNumber: true } },
      user: { select: { name: true } },
      staff: { select: { name: true } },
    },
    orderBy: { start: "asc" },
  });
}

export async function createEvent(data: {
  title: string;
  description?: string | null;
  start: Date;
  end: Date;
  type?: EventType;
  allDay?: boolean;
  color?: string | null;
  caseId?: string | null;
  userId?: string | null;
  staffId?: string | null;
}) {
  return prisma.event.create({ data });
}

export async function updateEvent(
  id: string,
  data: {
    title?: string;
    description?: string | null;
    start?: Date;
    end?: Date;
    type?: EventType;
    allDay?: boolean;
    color?: string | null;
    caseId?: string | null;
    userId?: string | null;
    staffId?: string | null;
  }
) {
  return prisma.event.update({ where: { id }, data });
}

export async function deleteEvent(id: string) {
  return prisma.event.delete({ where: { id } });
}

// Simple staff list for dropdowns
export async function getStaffUsers() {
  return prisma.user.findMany({
    where: { role: { in: ["admin", "staff"] }, active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

// ----- Service Jobs (Cases with full filtering) -----

export async function getServiceJobs(options?: {
  search?: string;
  status?: CaseStatus | "all";
  serviceId?: string;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  page?: number;
}) {
  const page = options?.page ?? 1;
  const skip = (page - 1) * ITEMS_PER_PAGE;

  const where: Record<string, unknown> = {};
  if (options?.status && options.status !== "all") where.status = options.status;
  if (options?.serviceId) where.serviceId = options.serviceId;
  if (options?.search?.trim()) {
    where.OR = [
      { caseNumber: { contains: options.search } },
      { user: { name: { contains: options.search } } },
      { user: { email: { contains: options.search } } },
      { user: { phone: { contains: options.search } } },
    ];
  }
  const dateRange: { gte?: Date; lte?: Date } = {};
  if (options?.dateFrom) {
    const d = typeof options.dateFrom === "string" ? new Date(options.dateFrom) : options.dateFrom;
    d.setHours(0, 0, 0, 0);
    dateRange.gte = d;
  }
  if (options?.dateTo) {
    const d = typeof options.dateTo === "string" ? new Date(options.dateTo) : options.dateTo;
    d.setHours(23, 59, 59, 999);
    dateRange.lte = d;
  }
  if (dateRange.gte || dateRange.lte) where.createdAt = dateRange;

  const [cases, total] = await Promise.all([
    prisma.case.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        service: { select: { id: true, name: true, slug: true } },
        staffAssignments: { include: { user: { select: { id: true, name: true, email: true } } } },
        invoices: { select: { id: true, amount: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: ITEMS_PER_PAGE,
    }),
    prisma.case.count({ where }),
  ]);
  return { jobs: cases, total, page, totalPages: Math.ceil(total / ITEMS_PER_PAGE) };
}

// ----- Payment settings -----

export async function getAdminPaymentSettings(): Promise<PaymentSettings> {
  await ensureStaffAccess();
  return getPaymentSettings();
}

export async function updateAdminPaymentSettings(input: PaymentSettings) {
  await ensureStaffAccess();
  await savePaymentSettings(input);
  return { success: true as const };
}

export async function createServiceJob(data: {
  userId: string;
  serviceId: string;
  amount: number;
  status?: CaseStatus;
  staffIds?: string[];
}) {
  const caseNumber = nextCaseNumber();
  const status = data.status ?? "new";
  const c = await prisma.case.create({
    data: {
      caseNumber,
      userId: data.userId,
      serviceId: data.serviceId,
      status,
    },
  });
  await prisma.invoice.create({
    data: {
      caseId: c.id,
      userId: data.userId,
      amount: data.amount,
      currency: "THB",
      status: "draft",
    },
  });
  if (data.staffIds?.length) {
    for (const uid of data.staffIds) {
      await prisma.staffAssignment.create({
        data: { caseId: c.id, userId: uid, role: "support" },
      });
    }
  }
  return c;
}

export async function updateServiceJob(
  id: string,
  data: {
    status?: CaseStatus;
    serviceId?: string;
    amount?: number;
    staffIds?: string[];
  }
) {
  if (data.status !== undefined) {
    await prisma.case.update({ where: { id }, data: { status: data.status } });
  }
  if (data.serviceId !== undefined) {
    await prisma.case.update({ where: { id }, data: { serviceId: data.serviceId } });
  }
  if (data.amount !== undefined) {
    const inv = await prisma.invoice.findFirst({ where: { caseId: id }, orderBy: { createdAt: "desc" } });
    if (inv) {
      await prisma.invoice.update({ where: { id: inv.id }, data: { amount: data.amount } });
    } else {
      const c = await prisma.case.findUnique({ where: { id }, include: { user: true } });
      if (c) {
        await prisma.invoice.create({
          data: { caseId: id, userId: c.userId, amount: data.amount, currency: "THB", status: "draft" },
        });
      }
    }
  }
  if (data.staffIds !== undefined) {
    await prisma.staffAssignment.deleteMany({ where: { caseId: id } });
    for (const uid of data.staffIds) {
      await prisma.staffAssignment.create({
        data: { caseId: id, userId: uid, role: "support" },
      });
    }
  }
  return prisma.case.findUnique({ where: { id } });
}

"use server";

import { prisma } from "@/lib/db";
import { nextCaseNumber } from "@/lib/utils";
import type { CaseStatus, InvoiceStatus, ServiceType, UserRole, EventType } from "@prisma/client";
import bcrypt from "bcryptjs";

const ITEMS_PER_PAGE = 20;

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
        invoice: { include: { case: { select: { caseNumber: true } }, user: { select: { name: true } } } },
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
  userId: string;
  amount: number;
  currency?: string;
  dueDate?: Date | null;
}) {
  return prisma.invoice.create({
    data: {
      ...data,
      currency: data.currency ?? "THB",
      status: "draft",
    },
  });
}

export async function updateInvoice(
  id: string,
  data: { amount?: number; status?: InvoiceStatus; dueDate?: Date | null }
) {
  return prisma.invoice.update({ where: { id }, data });
}

// ----- Payments -----

export async function getPayments(options?: { status?: string; page?: number }) {
  const page = options?.page ?? 1;
  const skip = (page - 1) * ITEMS_PER_PAGE;
  const where =
    options?.status && options.status !== "all"
      ? { status: options.status as "submitted" | "approved" | "rejected" }
      : {};

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        invoice: { include: { case: { include: { service: true } }, user: true } },
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

export async function addManualPayment(data: {
  invoiceId: string;
  caseId: string;
  amount: number;
  method: "qr" | "bank" | "wise" | "stripe";
  currency?: string;
}) {
  return prisma.payment.create({
    data: {
      ...data,
      currency: data.currency ?? "THB",
      status: "approved",
    },
  });
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
  return payment;
}

export async function rejectPayment(id: string) {
  return prisma.payment.update({
    where: { id },
    data: { status: "rejected" },
  });
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
  caseId: string;
  name: string;
  storageKey: string;
  mimeType?: string | null;
  size?: number | null;
  documentType?: string | null;
  uploadedBy?: string | null;
}) {
  return prisma.document.create({ data });
}

export async function deleteDocument(id: string) {
  return prisma.document.delete({ where: { id } });
}

export async function reassignDocument(id: string, caseId: string) {
  return prisma.document.update({ where: { id }, data: { caseId } });
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

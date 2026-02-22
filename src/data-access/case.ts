import { prisma } from "@/lib/db";
import type { CaseStatus } from "@prisma/client";

export async function getCaseById(id: string) {
  return prisma.case.findUnique({
    where: { id },
    include: {
      service: true,
      user: true,
      quotes: true,
      payments: true,
      documents: true,
      staffAssignments: { include: { user: true } },
      caseNotes: true,
      invoices: true,
    },
  });
}

/** Case scoped to userId – use for portal/checkout when user must own the case. */
export async function getCaseByIdForUser(id: string, userId: string) {
  return prisma.case.findFirst({
    where: { id, userId },
    include: {
      service: true,
      user: true,
      quotes: true,
      payments: true,
      documents: true,
      staffAssignments: { include: { user: true } },
      caseNotes: true,
      invoices: true,
    },
  });
}

export async function getCasesByUserId(userId: string) {
  return prisma.case.findMany({
    where: { userId },
    include: { service: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCasesList(filters?: { status?: CaseStatus; assignedTo?: string }) {
  return prisma.case.findMany({
    where: {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.assignedTo && {
        staffAssignments: { some: { userId: filters.assignedTo } },
      }),
    },
    include: {
      service: true,
      user: true,
      staffAssignments: { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Get guest case by id and token – for guest checkout. */
export async function getCaseByIdWithToken(id: string, token: string) {
  return prisma.case.findFirst({
    where: { id, guestCheckoutToken: token, isGuest: true, userId: null },
    include: {
      service: true,
      quotes: true,
      payments: true,
      documents: true,
      staffAssignments: { include: { user: true } },
      caseNotes: true,
      invoices: true,
    },
  });
}

/** Find guest cases by email for upgrade-to-user flow. */
export async function getGuestCasesByEmail(email: string) {
  return prisma.case.findMany({
    where: { isGuest: true, guestEmail: email.toLowerCase().trim() },
    include: { service: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Link guest cases to user and upgrade. Also updates invoices for those cases. */
export async function linkGuestCasesToUser(email: string, userId: string) {
  const normalized = email.toLowerCase().trim();
  const cases = await prisma.case.findMany({
    where: { isGuest: true, guestEmail: normalized },
    select: { id: true },
  });
  const caseIds = cases.map((c) => c.id);
  await prisma.$transaction([
    prisma.case.updateMany({
      where: { id: { in: caseIds } },
      data: { userId, isGuest: false, guestName: null, guestEmail: null, guestPhone: null, guestCheckoutToken: null },
    }),
    prisma.invoice.updateMany({
      where: { caseId: { in: caseIds } },
      data: { userId },
    }),
  ]);
}

export async function createCase(data: {
  caseNumber: string;
  userId?: string | null;
  serviceId: string;
  status?: CaseStatus;
  isGuest?: boolean;
  guestCheckoutToken?: string | null;
  guestEmail?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  formData?: object;
}) {
  return prisma.case.create({
    data: {
      ...data,
      status: data.status ?? "new",
      isGuest: data.isGuest ?? false,
    },
  });
}

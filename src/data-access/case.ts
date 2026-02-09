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

export async function createCase(data: {
  caseNumber: string;
  userId: string;
  serviceId: string;
  status?: CaseStatus;
  guestEmail?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  formData?: object;
}) {
  return prisma.case.create({
    data: {
      ...data,
      status: data.status ?? "new",
    },
  });
}

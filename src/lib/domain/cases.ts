import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { nextCaseNumber } from "@/lib/utils";
import { createCase as createCaseRecord } from "@/data-access/case";
import { createInvoice } from "@/data-access/invoice";
import type { CaseStatus } from "@prisma/client";

export interface CreateBookingCaseInput {
  serviceId: string;
  isGuest: boolean;
  userId?: string;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
  formData?: Record<string, unknown>;
  documentIds?: string[];
}

export async function getUserCases(userId: string) {
  return prisma.case.findMany({
    where: { userId },
    include: {
      service: true,
      invoices: true,
      documents: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserCaseById(userId: string, caseId: string) {
  return prisma.case.findFirst({
    where: { id: caseId, userId },
    include: {
      service: true,
      invoices: true,
      documents: true,
      payments: true,
      quotes: true,
    },
  });
}

export async function updateCaseStatus(caseId: string, status: CaseStatus) {
  return prisma.case.update({
    where: { id: caseId },
    data: { status },
  });
}

export async function createBookingCase(input: CreateBookingCaseInput) {
  const service = await prisma.service.findUnique({
    where: { id: input.serviceId },
  });
  if (!service || !service.active) {
    throw new Error("Service not found or inactive");
  }

  const userId = input.isGuest ? undefined : input.userId;
  if (!userId && !input.isGuest) {
    throw new Error("User ID required for logged-in booking");
  }
  if (input.isGuest && !input.guestEmail?.trim()) {
    throw new Error("Guest email required");
  }

  const status: CaseStatus = service.type === "fixed" ? "new" : "under_review";
  const guestCheckoutToken = input.isGuest ? randomBytes(32).toString("hex") : undefined;

  const c = await createCaseRecord({
    caseNumber: nextCaseNumber(),
    userId: userId ?? null,
    serviceId: input.serviceId,
    status,
    isGuest: input.isGuest,
    guestCheckoutToken: guestCheckoutToken ?? null,
    guestEmail: input.guestEmail?.trim() || null,
    guestName: input.guestName?.trim() || null,
    guestPhone: input.guestPhone?.trim() || null,
    formData: (input.formData ?? {}) as object,
  });

  if (input.documentIds?.length) {
    await prisma.document.updateMany({
      where: { id: { in: input.documentIds } },
      data: { caseId: c.id },
    });
  }

  if (service.type === "fixed" && service.priceAmount != null && service.priceAmount > 0) {
    await createInvoice({
      caseId: c.id,
      userId: userId ?? null,
      amount: service.priceAmount,
      currency: service.priceCurrency ?? "THB",
      status: "unpaid",
    });
  }

  return {
    caseId: c.id,
    caseNumber: c.caseNumber,
    isFixed: service.type === "fixed",
    guestCheckoutToken,
  };
}

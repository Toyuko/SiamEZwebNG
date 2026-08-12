import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import type { QuoteStatus, QuoteType, Prisma } from "@prisma/client";
import { nextCaseNumber } from "@/lib/utils";

export async function getQuoteById(id: string) {
  return prisma.quote.findUnique({
    where: { id },
    include: {
      case: true,
      service: true,
      user: { select: { id: true, name: true, email: true } },
      adjustedBy: { select: { id: true, name: true, email: true } },
      invoices: true,
    },
  });
}

export async function getQuoteByGuestToken(guestToken: string) {
  return prisma.quote.findUnique({
    where: { guestToken },
    include: { service: true, case: true },
  });
}

export async function getQuotesByCaseId(caseId: string) {
  return prisma.quote.findMany({
    where: { caseId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getActiveQuoteByCaseId(caseId: string) {
  return prisma.quote.findFirst({
    where: {
      caseId,
      status: { in: ["draft", "generated", "sent", "viewed", "accepted"] },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listQuotes(filters?: {
  status?: QuoteStatus;
  serviceId?: string;
  search?: string;
  take?: number;
  skip?: number;
}) {
  const where: Prisma.QuoteWhereInput = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.serviceId) where.serviceId = filters.serviceId;
  if (filters?.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { quoteNumber: { contains: q, mode: "insensitive" } },
      { guestToken: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { case: { caseNumber: { contains: q, mode: "insensitive" } } },
      { case: { guestEmail: { contains: q, mode: "insensitive" } } },
    ];
  }

  const take = filters?.take ?? 50;
  const skip = filters?.skip ?? 0;

  const [items, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      include: {
        service: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, name: true, email: true } },
        case: { select: { id: true, caseNumber: true, status: true } },
        invoices: { select: { id: true, status: true, amount: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.quote.count({ where }),
  ]);

  return { items, total };
}

export async function createQuote(data: {
  caseId?: string | null;
  serviceId: string;
  userId?: string | null;
  amount: number;
  currency?: string;
  status?: QuoteStatus;
  quoteType?: QuoteType;
  validUntil?: Date;
  notes?: string;
  requirements?: Prisma.InputJsonValue;
  pricingBreakdown?: Prisma.InputJsonValue;
  subtotal?: number;
  governmentFees?: number;
  addOnsTotal?: number;
  discount?: number;
  rangeMin?: number;
  rangeMax?: number;
  originalAmount?: number;
}) {
  const guestToken = data.userId ? undefined : randomBytes(24).toString("hex");
  const quoteNumber = nextCaseNumber("QT");

  return prisma.quote.create({
    data: {
      quoteNumber,
      caseId: data.caseId ?? undefined,
      serviceId: data.serviceId,
      userId: data.userId ?? undefined,
      guestToken,
      amount: data.amount,
      currency: data.currency ?? "THB",
      status: data.status ?? "generated",
      quoteType: data.quoteType ?? "calculated",
      validUntil: data.validUntil ?? undefined,
      notes: data.notes ?? undefined,
      requirements: data.requirements ?? undefined,
      pricingBreakdown: data.pricingBreakdown ?? undefined,
      subtotal: data.subtotal ?? undefined,
      governmentFees: data.governmentFees ?? undefined,
      addOnsTotal: data.addOnsTotal ?? undefined,
      discount: data.discount ?? 0,
      rangeMin: data.rangeMin ?? undefined,
      rangeMax: data.rangeMax ?? undefined,
      originalAmount: data.originalAmount ?? data.amount,
    },
  });
}

export async function updateQuoteStatus(
  id: string,
  status: QuoteStatus,
  extra?: { sentAt?: Date; acceptedAt?: Date; viewedAt?: Date; caseId?: string }
) {
  return prisma.quote.update({
    where: { id },
    data: {
      status,
      ...(extra?.sentAt && { sentAt: extra.sentAt }),
      ...(extra?.acceptedAt && { acceptedAt: extra.acceptedAt }),
      ...(extra?.viewedAt && { viewedAt: extra.viewedAt }),
      ...(extra?.caseId && { caseId: extra.caseId }),
    },
  });
}

export async function attachQuoteToCase(quoteId: string, caseId: string) {
  return prisma.quote.update({
    where: { id: quoteId },
    data: {
      caseId,
      status: "converted_to_booking",
      acceptedAt: new Date(),
    },
  });
}

export async function applyAdminQuoteAdjustment(input: {
  quoteId: string;
  adjustmentAmount: number;
  reason: string;
  adminUserId: string;
  adminNotes?: string;
}) {
  const existing = await prisma.quote.findUnique({ where: { id: input.quoteId } });
  if (!existing) throw new Error("Quote not found");

  const original = existing.originalAmount ?? existing.amount;
  const finalAmount = Math.max(0, original + input.adjustmentAmount);

  return prisma.quote.update({
    where: { id: input.quoteId },
    data: {
      originalAmount: original,
      adjustmentAmount: input.adjustmentAmount,
      adjustmentReason: input.reason,
      adjustedById: input.adminUserId,
      adjustedAt: new Date(),
      amount: finalAmount,
      adminNotes: input.adminNotes ?? existing.adminNotes,
    },
  });
}

export async function updateQuoteAdmin(input: {
  quoteId: string;
  status?: QuoteStatus;
  amount?: number;
  notes?: string;
  adminNotes?: string;
  validUntil?: Date | null;
}) {
  return prisma.quote.update({
    where: { id: input.quoteId },
    data: {
      ...(input.status !== undefined && { status: input.status }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.adminNotes !== undefined && { adminNotes: input.adminNotes }),
      ...(input.validUntil !== undefined && { validUntil: input.validUntil }),
    },
  });
}

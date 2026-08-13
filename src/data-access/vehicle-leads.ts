import { randomBytes } from "crypto";
import type { Prisma, VehicleLeadStatus, VehicleLeadType, VehicleKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { nextCaseNumber } from "@/lib/utils";

export function newPublicToken(): string {
  return randomBytes(24).toString("hex");
}

export function newReferralTokenValue(): string {
  return `vlr_${randomBytes(24).toString("hex")}`;
}

const leadInclude = {
  vehicle: true,
  media: { orderBy: { createdAt: "asc" as const } },
  assignedStaff: { select: { id: true, name: true, email: true } },
  case: { select: { id: true, caseNumber: true, status: true } },
  statusHistory: { orderBy: { createdAt: "desc" as const }, take: 20 },
  leadNotes: {
    orderBy: { createdAt: "desc" as const },
    take: 30,
    include: { user: { select: { name: true, email: true } } },
  },
  socialContent: { orderBy: { createdAt: "desc" as const }, take: 5 },
  socialPosts: { orderBy: { createdAt: "desc" as const } },
  referralToken: { select: { id: true, staffId: true, campaign: true } },
} satisfies Prisma.VehicleLeadInclude;

export type VehicleLeadWithRelations = Prisma.VehicleLeadGetPayload<{ include: typeof leadInclude }>;

export type VehicleLeadListFilters = {
  type?: VehicleLeadType;
  status?: VehicleLeadStatus;
  vehicleKind?: VehicleKind;
  province?: string;
  assignedStaffId?: string;
  source?: string;
  from?: Date;
  to?: Date;
  minPrice?: number;
  maxPrice?: number;
  q?: string;
};

export async function createVehicleLeadRecord(data: Prisma.VehicleLeadCreateInput) {
  return prisma.vehicleLead.create({ data, include: leadInclude });
}

export async function getVehicleLeadById(id: string) {
  return prisma.vehicleLead.findUnique({ where: { id }, include: leadInclude });
}

export async function getVehicleLeadByNumber(leadNumber: string, publicToken?: string) {
  if (!publicToken) return null;
  return prisma.vehicleLead.findFirst({
    where: {
      leadNumber,
      publicToken,
    },
    include: {
      vehicle: true,
      media: { where: { isPrivate: false }, orderBy: { createdAt: "asc" } },
    },
  });
}

export async function listVehicleLeads(filters: VehicleLeadListFilters = {}, take = 80) {
  const where: Prisma.VehicleLeadWhereInput = {};
  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;
  if (filters.vehicleKind) where.vehicleKind = filters.vehicleKind;
  if (filters.province) where.province = filters.province;
  if (filters.assignedStaffId) where.assignedStaffId = filters.assignedStaffId;
  if (filters.source) where.source = filters.source;
  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }
  if (filters.minPrice != null || filters.maxPrice != null) {
    where.OR = [
      {
        askingPrice: {
          ...(filters.minPrice != null ? { gte: filters.minPrice } : {}),
          ...(filters.maxPrice != null ? { lte: filters.maxPrice } : {}),
        },
      },
      {
        budgetMax: {
          ...(filters.minPrice != null ? { gte: filters.minPrice } : {}),
          ...(filters.maxPrice != null ? { lte: filters.maxPrice } : {}),
        },
      },
    ];
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.AND = [
      {
        OR: [
          { leadNumber: { contains: q, mode: "insensitive" } },
          { displayTitle: { contains: q, mode: "insensitive" } },
          { customerName: { contains: q, mode: "insensitive" } },
          { customerPhone: { contains: q, mode: "insensitive" } },
          { customerEmail: { contains: q, mode: "insensitive" } },
        ],
      },
    ];
  }

  return prisma.vehicleLead.findMany({
    where,
    include: {
      vehicle: true,
      assignedStaff: { select: { id: true, name: true, email: true } },
      case: { select: { id: true, caseNumber: true } },
      _count: { select: { media: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getVehicleLeadStats() {
  const [total, sell, buy, followUp, negotiating, completed, pipeline] = await Promise.all([
    prisma.vehicleLead.count({ where: { status: "new" } }),
    prisma.vehicleLead.count({ where: { type: "sell", status: { notIn: ["completed", "cancelled"] } } }),
    prisma.vehicleLead.count({ where: { type: "buy", status: { notIn: ["completed", "cancelled"] } } }),
    prisma.vehicleLead.count({
      where: { status: { in: ["new", "reviewing", "contacted"] } },
    }),
    prisma.vehicleLead.count({ where: { status: "negotiating" } }),
    prisma.vehicleLead.count({ where: { status: { in: ["sold_or_purchased", "completed"] } } }),
    prisma.vehicleLead.aggregate({
      where: { status: { notIn: ["completed", "cancelled"] } },
      _sum: { askingPrice: true, budgetMax: true, officialListingPrice: true },
    }),
  ]);
  return {
    newCount: total,
    selling: sell,
    buying: buy,
    followUp,
    negotiating,
    completed,
    pipelineValue:
      (pipeline._sum.officialListingPrice ?? 0) ||
      (pipeline._sum.askingPrice ?? 0) + (pipeline._sum.budgetMax ?? 0),
  };
}

export async function nextVehicleLeadNumber(): Promise<string> {
  return nextCaseNumber("VL");
}

export async function findRecentDuplicate(input: {
  type: VehicleLeadType;
  customerPhone?: string | null;
  customerEmail?: string | null;
  displayTitle: string;
}): Promise<string | null> {
  const since = new Date(Date.now() - 10 * 60 * 1000);
  const or: Prisma.VehicleLeadWhereInput[] = [];
  if (input.customerPhone) or.push({ customerPhone: input.customerPhone });
  if (input.customerEmail) or.push({ customerEmail: input.customerEmail });
  if (or.length === 0) return null;
  const existing = await prisma.vehicleLead.findFirst({
    where: {
      type: input.type,
      displayTitle: input.displayTitle,
      createdAt: { gte: since },
      OR: or,
    },
    select: { leadNumber: true },
  });
  return existing?.leadNumber ?? null;
}

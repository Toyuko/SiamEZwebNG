import { prisma } from "@/lib/db";
import type { MarketplaceJobStatus } from "@prisma/client";

export async function createMarketplaceJobRecord(data: {
  caseId: string;
  budget: number;
  status?: MarketplaceJobStatus;
}) {
  return prisma.marketplaceJob.create({
    data: {
      caseId: data.caseId,
      budget: data.budget,
      status: data.status ?? "OPEN",
    },
  });
}

export async function getMarketplaceJobByCaseId(caseId: string) {
  return prisma.marketplaceJob.findUnique({
    where: { caseId },
    include: {
      case: { include: { service: true } },
      freelancer: { select: { id: true, name: true, email: true } },
    },
  });
}

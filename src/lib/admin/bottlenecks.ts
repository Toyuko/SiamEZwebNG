import { prisma } from "@/lib/db";

export async function getBottlenecks(days = 7) {
  const cutoff = new Date(Date.now() - Math.max(days, 1) * 86_400_000);
  const [cases, steps] = await Promise.all([
    prisma.case.groupBy({
      by: ["status"],
      where: { updatedAt: { lte: cutoff }, status: { notIn: ["completed", "cancelled"] } },
      _count: { _all: true },
    }),
    prisma.workflowStepRun.findMany({
      where: { status: "pending", updatedAt: { lte: cutoff } },
      select: { id: true, updatedAt: true, templateStep: { select: { titleEn: true } } },
      orderBy: { updatedAt: "asc" },
      take: 50,
    }),
  ]);
  return {
    casesByStatus: cases.map((row) => ({ status: row.status, count: row._count._all })),
    pendingSteps: steps.map((row) => ({ id: row.id, title: row.templateStep.titleEn, ageDays: Math.floor((Date.now() - row.updatedAt.getTime()) / 86_400_000) })),
  };
}

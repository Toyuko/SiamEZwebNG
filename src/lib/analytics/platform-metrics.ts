import { prisma } from "@/lib/db";

const since = (days: number) => new Date(Date.now() - days * 86_400_000);

export async function getPlatformAnalytics() {
  const thirtyDays = since(30);
  const [views7d, views30d, enquiries, vehicles, properties, createdCases, paidCases, completedRuns, totalRuns, events, revenue] = await Promise.all([
    prisma.listingView.count({ where: { viewedAt: { gte: since(7) } } }),
    prisma.listingView.count({ where: { viewedAt: { gte: thirtyDays } } }),
    prisma.listingEnquiry.count({ where: { createdAt: { gte: thirtyDays } } }),
    prisma.salesVehicle.count({ where: { published: true } }),
    prisma.salesProperty.count({ where: { published: true } }),
    prisma.case.count({ where: { createdAt: { gte: thirtyDays } } }),
    prisma.case.count({ where: { createdAt: { gte: thirtyDays }, status: { in: ["paid", "in_progress", "completed"] } } }),
    prisma.workflowRun.count({ where: { completedAt: { gte: thirtyDays } } }),
    prisma.workflowRun.count({ where: { createdAt: { gte: thirtyDays } } }),
    prisma.platformMetricEvent.groupBy({ by: ["kind"], where: { createdAt: { gte: thirtyDays } }, _count: { _all: true } }),
    prisma.payment.aggregate({ where: { status: "approved", approvedAt: { gte: thirtyDays } }, _sum: { amount: true } }),
  ]);
  return {
    marketplace: { views7d, views30d, enquiries30d: enquiries, publishedListings: vehicles + properties },
    caseFunnel: { created30d: createdCases, paidish30d: paidCases, conversionRate: createdCases ? paidCases / createdCases : 0 },
    workflows: { completed30d: completedRuns, started30d: totalRuns, completionRate: totalRuns ? completedRuns / totalRuns : 0 },
    events: events.map((row) => ({ kind: row.kind, count: row._count._all })),
    revenue30d: revenue._sum.amount ?? 0,
  };
}

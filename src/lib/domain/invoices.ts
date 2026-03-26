import { prisma } from "@/lib/db";

export async function getUserInvoices(userId: string) {
  return prisma.invoice.findMany({
    where: { userId },
    include: {
      case: { include: { service: true } },
      quote: true,
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

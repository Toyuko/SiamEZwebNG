import { prisma } from "@/lib/db";

/**
 * Placeholder for future email/push notifications to registered freelancers.
 */
export async function notifyFreelancers(jobId: string): Promise<void> {
  // TODO: integrate email blast or push notification service
  console.info("[marketplace] notifyFreelancers queued for job", jobId);
}

function deriveMarketplaceBudget(
  service: { priceAmount: number | null },
  formData?: Record<string, unknown>,
): number {
  const driverLicense = formData?.driverLicense as { totalThb?: number } | undefined;
  if (typeof driverLicense?.totalThb === "number" && driverLicense.totalThb > 0) {
    return Math.round(driverLicense.totalThb * 100);
  }

  if (service.priceAmount != null && service.priceAmount > 0) {
    return service.priceAmount;
  }

  return 0;
}

export async function createMarketplaceJobForCase(input: {
  caseId: string;
  serviceId: string;
  formData?: Record<string, unknown>;
}): Promise<{ jobId: string }> {
  const service = await prisma.service.findUnique({
    where: { id: input.serviceId },
    select: { priceAmount: true },
  });
  if (!service) {
    throw new Error("Service not found for marketplace job");
  }

  const budget = deriveMarketplaceBudget(service, input.formData);

  const job = await prisma.$transaction(async (tx) => {
    return tx.marketplaceJob.create({
      data: {
        caseId: input.caseId,
        budget,
        status: "OPEN",
      },
    });
  });

  return { jobId: job.id };
}

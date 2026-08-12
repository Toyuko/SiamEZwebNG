import { prisma } from "@/lib/db";
import { sendMarketplaceJobEmails } from "@/lib/email/messages";

/**
 * Email verified, active freelancers about a newly posted marketplace job.
 */
export async function notifyFreelancers(jobId: string): Promise<void> {
  const job = await prisma.marketplaceJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      budget: true,
      case: {
        select: {
          service: { select: { name: true } },
        },
      },
    },
  });

  if (!job) {
    console.warn("[marketplace] notifyFreelancers: job not found", jobId);
    return;
  }

  const freelancers = await prisma.user.findMany({
    where: {
      role: "freelancer",
      active: true,
      freelancerProfile: {
        verificationStatus: "verified",
      },
    },
    select: {
      email: true,
      name: true,
      notificationPreferences: true,
    },
    take: 100,
  });

  const recipients = freelancers
    .filter((f) => Boolean(f.email))
    .map((f) => ({ email: f.email, name: f.name }));

  if (recipients.length === 0) {
    console.info("[marketplace] notifyFreelancers: no verified freelancers", jobId);
    return;
  }

  const budgetLabel =
    job.budget > 0
      ? `฿${(job.budget / 100).toLocaleString()}`
      : "Quote / TBD";

  sendMarketplaceJobEmails({
    jobId: job.id,
    recipients,
    budgetLabel: job.case?.service?.name
      ? `${job.case.service.name} · ${budgetLabel}`
      : budgetLabel,
  });
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

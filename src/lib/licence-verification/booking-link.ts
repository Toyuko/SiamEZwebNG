import { prisma } from "@/lib/db";
import { QUOTATION_ALLOWED_STATUSES } from "@/lib/licence-verification/types";

/** Attach a booking created from an approved licence quotation. Safe to call when no application exists. */
export async function linkLicenceBooking(input: { quoteId: string; caseId: string }): Promise<void> {
  const application = await prisma.licenceApplication.findUnique({
    where: { quoteId: input.quoteId },
    select: { id: true, status: true, caseId: true },
  });
  if (!application || application.caseId) return;
  const invoice = await prisma.invoice.findFirst({
    where: { caseId: input.caseId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  const allowed = (QUOTATION_ALLOWED_STATUSES as readonly string[]).includes(application.status);
  const nextStatus = allowed && invoice ? "BOOKING_CONFIRMED" : application.status;
  await prisma.licenceApplication.update({
    where: { id: application.id },
    data: {
      caseId: input.caseId,
      invoiceId: invoice?.id,
      status: nextStatus,
    },
  });
  await prisma.licenceApplicationHistory.create({
    data: {
      applicationId: application.id,
      event: "BOOKING_LINKED",
      fromStatus: application.status,
      toStatus: nextStatus,
      detail: invoice
        ? `Booking ${input.caseId} was created from the approved quotation.`
        : `Booking ${input.caseId} was created without an invoice because the application is not approved.`,
    },
  });
}

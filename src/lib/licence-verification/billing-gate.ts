import { prisma } from "@/lib/db";
import { LicenceBillingBlockedError, invoiceGateDecision, type BillingSubject } from "@/lib/licence-verification/gate";

function missingTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";
  return code === "P2021" || message.includes("licence_applications");
}

export async function findLicenceBillingSubject(input: {
  caseId?: string | null;
  quoteId?: string | null;
}): Promise<BillingSubject | null> {
  if (!input.caseId && !input.quoteId) return null;
  const or = [
    input.caseId ? { caseId: input.caseId } : undefined,
    input.quoteId ? { quoteId: input.quoteId } : undefined,
  ].filter((item): item is { caseId: string } | { quoteId: string } => Boolean(item));
  try {
    return await prisma.licenceApplication.findFirst({
      where: { OR: or },
      select: { id: true, status: true, referenceNumber: true },
    });
  } catch (error) {
    if (missingTable(error)) {
      console.error("[licence-verification] requirements table is not migrated yet; billing gate skipped");
      return null;
    }
    throw error;
  }
}

export async function enforceLicenceInvoiceGate(input: {
  caseId?: string | null;
  quoteId?: string | null;
  overrideReason?: string | null;
  staffId?: string | null;
}): Promise<void> {
  const application = await findLicenceBillingSubject(input);
  const decision = invoiceGateDecision({ application, overrideReason: input.overrideReason });
  if (!decision.allowed) throw new LicenceBillingBlockedError(decision.message);
  if (!application || !decision.override) return;
  const reason = input.overrideReason?.trim() ?? "";
  await prisma.licenceApprovalRecord.create({
    data: {
      applicationId: application.id,
      staffId: input.staffId || null,
      decision: "OVERRIDE",
      reason,
      previousStatus: application.status,
    },
  });
  await prisma.licenceApplicationHistory.create({
    data: {
      applicationId: application.id,
      actorId: input.staffId || null,
      event: "BILLING_OVERRIDE",
      fromStatus: application.status,
      toStatus: application.status,
      detail: reason,
    },
  });
}

export { LicenceBillingBlockedError };

import { QUOTATION_ALLOWED_STATUSES } from "@/lib/licence-verification/types";

export class LicenceBillingBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LicenceBillingBlockedError";
  }
}

export type BillingSubject = {
  id: string;
  status: string;
  referenceNumber: string;
};

export type BillingDecision =
  | { allowed: true; override: boolean }
  | { allowed: false; override: false; message: string };

const MIN_OVERRIDE = 8;

export function invoiceGateDecision(input: {
  application: BillingSubject | null;
  overrideReason?: string | null;
}): BillingDecision {
  if (!input.application) return { allowed: true, override: false };
  if ((QUOTATION_ALLOWED_STATUSES as readonly string[]).includes(input.application.status)) {
    return { allowed: true, override: false };
  }
  const reason = input.overrideReason?.trim() ?? "";
  if (reason.length >= MIN_OVERRIDE) return { allowed: true, override: true };
  return {
    allowed: false,
    override: false,
    message: `Application ${input.application.referenceNumber} is not approved for quotation (current status: ${input.application.status.replaceAll("_", " ").toLowerCase()}). Approve it in the AI Licence Verification Centre before creating a quotation or invoice. An administrator can override this only by recording a reason.`,
  };
}

export function quotationGateDecision(input: {
  status: string;
  referenceNumber: string;
  overrideReason?: string | null;
}): BillingDecision {
  return invoiceGateDecision({
    application: {
      id: "application",
      status: input.status,
      referenceNumber: input.referenceNumber,
    },
    overrideReason: input.overrideReason,
  });
}

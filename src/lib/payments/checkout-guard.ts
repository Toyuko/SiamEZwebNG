/**
 * Server-side guards for quote checkout.
 * Never trust client-supplied amounts, percentages, or service IDs.
 */

import type { PaymentChoice, QuotePaymentPlan } from "./quote-plan";
import { payableAmountForChoice } from "./quote-plan";

export class CheckoutValidationError extends Error {
  constructor(
    message: string,
    readonly code:
      | "AMOUNT_MISMATCH"
      | "QUOTE_NOT_OWNED"
      | "QUOTE_EXPIRED"
      | "QUOTE_NOT_PAYABLE"
      | "DUPLICATE_BOOKING"
      | "HUMAN_REVIEW_REQUIRED"
      | "INVALID_CHOICE"
  ) {
    super(message);
    this.name = "CheckoutValidationError";
  }
}

export function validateCheckoutAmount(input: {
  plan: QuotePaymentPlan;
  choice: PaymentChoice;
  /** Optional client-claimed amount. If present it must match the server amount. */
  claimedAmountSatang?: number;
}): { amountSatang: number; choice: PaymentChoice } {
  if (input.choice !== "initial" && input.choice !== "full") {
    throw new CheckoutValidationError("Invalid payment choice", "INVALID_CHOICE");
  }
  if (input.plan.requires_human_review) {
    throw new CheckoutValidationError(
      "This request requires a custom quote from our SiamEZ team.",
      "HUMAN_REVIEW_REQUIRED"
    );
  }
  let amount: number;
  try {
    amount = payableAmountForChoice(input.plan, input.choice);
  } catch {
    throw new CheckoutValidationError("Invalid payment choice", "INVALID_CHOICE");
  }
  if (amount <= 0) {
    throw new CheckoutValidationError("Nothing payable on this quote", "QUOTE_NOT_PAYABLE");
  }
  if (
    input.claimedAmountSatang != null &&
    Math.round(input.claimedAmountSatang) !== amount
  ) {
    throw new CheckoutValidationError(
      "Payment amount does not match the required initial payment",
      "AMOUNT_MISMATCH"
    );
  }
  return { amountSatang: amount, choice: input.choice };
}

export function shouldProcessWebhookEvent(input: {
  eventId: string;
  alreadyProcessed: boolean;
  paymentAlreadyApproved: boolean;
}): { process: boolean; reason: "new" | "duplicate_event" | "already_approved" } {
  if (!input.eventId) {
    return { process: false, reason: "duplicate_event" };
  }
  if (input.alreadyProcessed) {
    return { process: false, reason: "duplicate_event" };
  }
  if (input.paymentAlreadyApproved) {
    return { process: false, reason: "already_approved" };
  }
  return { process: true, reason: "new" };
}

export function assertQuoteOwnership(input: {
  quoteUserId: string | null;
  quoteGuestToken: string | null;
  sessionUserId?: string | null;
  guestToken?: string | null;
}): void {
  const sessionOk = Boolean(
    input.sessionUserId && input.quoteUserId && input.sessionUserId === input.quoteUserId
  );
  const guestOk = Boolean(
    input.guestToken &&
      input.quoteGuestToken &&
      input.guestToken === input.quoteGuestToken
  );
  const anonymousGenerated =
    !input.quoteUserId && !input.sessionUserId && !input.guestToken;
  if (!sessionOk && !guestOk && !anonymousGenerated) {
    throw new CheckoutValidationError(
      "Not authorized to pay this quote",
      "QUOTE_NOT_OWNED"
    );
  }
}

/**
 * Payment provider abstraction - provider-agnostic design.
 * Phase 1: Manual (QR, Bank, Wise). Phase 2: Stripe.
 */

export type PaymentProviderType = "qr" | "bank" | "wise" | "stripe";

export interface PaymentInstructions {
  method: PaymentProviderType;
  /** Display label */
  label: string;
  /** Instructions / data to show (QR payload, bank details, etc.) */
  payload?: string;
  /** Extra display data (e.g. bank name, account) */
  details?: Record<string, string>;
}

export interface PaymentProvider {
  readonly type: PaymentProviderType;
  /** Whether instant confirmation (Stripe) or manual review */
  readonly isInstant: boolean;
  /** Get payment instructions for an invoice amount */
  getInstructions(amount: number, currency: string, reference: string): PaymentInstructions;
  /** Phase 2: process payment (Stripe only) */
  processPayment?(
    amount: number,
    currency: string,
    metadata: Record<string, string>
  ): Promise<{ success: boolean; clientSecret?: string; error?: string }>;
}

/**
 * Payment configuration for Thailand-based platform.
 * Bank transfer, QR (PromptPay), Wise - Stripe in Phase 2.
 *
 * Never ship bank account numbers as code defaults — configure those via env.
 * Wise uses a public receive tag, so product defaults are safe to ship.
 */

function envOrEmpty(name: string): string {
  const value = process.env[name];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : "";
}

function envOrDefault(name: string, fallback: string): string {
  const value = envOrEmpty(name);
  return value || fallback;
}

export const paymentConfig = {
  /** PromptPay ID: mobile (0XXXXXXXXX), tax ID (13 digits), or e-wallet */
  promptPayId: envOrEmpty("PROMPTPAY_ID"),

  /** Static Thai QR / PromptPay image shown when no amount-specific QR is generated */
  promptPayQrImage: "/images/payment/promptpay-static.png",

  /** Bank details for transfer */
  bank: {
    name: envOrEmpty("BANK_NAME"),
    branch: envOrEmpty("BANK_BRANCH"),
    accountName: envOrEmpty("BANK_ACCOUNT_NAME"),
    accountNumber: envOrEmpty("BANK_ACCOUNT_NUMBER"),
  },

  /** Wise transfer instructions (public receive tag) */
  wise: {
    beneficiary: envOrDefault("WISE_BENEFICIARY", "Touy Smith"),
    accountId: envOrDefault("WISE_ACCOUNT_ID", "@touygordondouglasphanchanas"),
    currency: "THB",
    payUrl: envOrDefault(
      "WISE_PAY_URL",
      "https://wise.com/pay/me/touygordondouglasphanchanas"
    ),
    qrImage: "/images/payment/wise-qr.png",
    details: envOrDefault(
      "WISE_DETAILS",
      "Wise tag: @touygordondouglasphanchanas\nReference: [Your invoice reference]"
    ),
    note: "Please include the invoice reference in the transfer details.",
  },
} as const;

export function isManualPaymentConfigured(): boolean {
  return Boolean(
    paymentConfig.promptPayId ||
      paymentConfig.bank.accountNumber ||
      paymentConfig.wise.accountId
  );
}

/**
 * Stripe card checkout is deferred. Set STRIPE_ENABLED=true when ready to ship it.
 * Until then, checkout uses PromptPay / bank transfer / Wise only.
 */
export function isStripeEnabled(): boolean {
  return process.env.STRIPE_ENABLED === "true";
}

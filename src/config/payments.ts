/**
 * Payment configuration for Thailand-based platform.
 * Bank transfer, QR (PromptPay), Wise - Stripe in Phase 2.
 *
 * Never ship real account numbers as code defaults — configure via env.
 */

function envOrEmpty(name: string): string {
  const value = process.env[name];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : "";
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

  /** Wise transfer instructions */
  wise: {
    beneficiary: envOrEmpty("WISE_BENEFICIARY"),
    accountId: envOrEmpty("WISE_ACCOUNT_ID"),
    currency: "THB",
    payUrl: envOrEmpty("WISE_PAY_URL"),
    qrImage: "/images/payment/wise-qr.png",
    details: envOrEmpty("WISE_DETAILS"),
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

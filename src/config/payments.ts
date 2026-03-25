/**
 * Payment configuration for Thailand-based platform.
 * Bank transfer, QR (PromptPay), Wise - Stripe in Phase 2.
 */

export const paymentConfig = {
  /** PromptPay ID: mobile (0XXXXXXXXX), tax ID (13 digits), or e-wallet */
  promptPayId: process.env.PROMPTPAY_ID ?? "0812345678",

  /** Bank details for transfer */
  bank: {
    name: process.env.BANK_NAME ?? "Kasikorn Bank",
    branch: process.env.BANK_BRANCH ?? "Head Office",
    accountName: process.env.BANK_ACCOUNT_NAME ?? "T Concierge",
    accountNumber: process.env.BANK_ACCOUNT_NUMBER ?? "2058950370",
  },

  /** Wise transfer instructions */
  wise: {
    beneficiary: process.env.WISE_BENEFICIARY ?? "T Concierge",
    accountId: process.env.WISE_ACCOUNT_ID ?? "@touygordondouglasphanchanas",
    currency: "THB",
    details:
      process.env.WISE_DETAILS ??
      "Account ID: @touygordondouglasphanchanas\nReference: [Your invoice reference]",
    note: "Please include the invoice reference in the transfer details.",
  },
} as const;

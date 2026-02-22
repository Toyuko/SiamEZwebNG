/**
 * Payment configuration for Thailand-based platform.
 * Bank transfer, QR (PromptPay), Wise - Stripe in Phase 2.
 */

export const paymentConfig = {
  /** PromptPay ID: mobile (0XXXXXXXXX), tax ID (13 digits), or e-wallet */
  promptPayId: process.env.PROMPTPAY_ID ?? "0812345678",

  /** Bank details for transfer */
  bank: {
    name: process.env.BANK_NAME ?? "Kasikorn Bank (KBank)",
    branch: process.env.BANK_BRANCH ?? "Head Office",
    accountName: process.env.BANK_ACCOUNT_NAME ?? "SiamEZ Professional Services Co., Ltd.",
    accountNumber: process.env.BANK_ACCOUNT_NUMBER ?? "123-4-56789-0",
  },

  /** Wise transfer instructions */
  wise: {
    beneficiary: process.env.WISE_BENEFICIARY ?? "SiamEZ Professional Services Co., Ltd.",
    currency: "THB",
    details: process.env.WISE_DETAILS ?? "Bank: Kasikorn Bank\nAccount: 123-4-56789-0\nReference: [Your invoice reference]",
    note: "Please include the invoice reference in the transfer details.",
  },
} as const;

/**
 * Payment configuration for Thailand-based platform.
 * Bank transfer, QR (PromptPay), Wise - Stripe in Phase 2.
 */

export const paymentConfig = {
  /** PromptPay ID: mobile (0XXXXXXXXX), tax ID (13 digits), or e-wallet */
  promptPayId: process.env.PROMPTPAY_ID ?? "5302601003497",

  /** Static Thai QR / PromptPay image shown when no amount-specific QR is generated */
  promptPayQrImage: "/images/payment/promptpay-static.png",

  /** Bank details for transfer */
  bank: {
    name: process.env.BANK_NAME ?? "Bangkok Bank",
    branch: process.env.BANK_BRANCH ?? "Head Office",
    accountName: process.env.BANK_ACCOUNT_NAME ?? "Touy Smith",
    accountNumber: process.env.BANK_ACCOUNT_NUMBER ?? "037-7-076153",
  },

  /** Wise transfer instructions */
  wise: {
    beneficiary: process.env.WISE_BENEFICIARY ?? "Touy Smith",
    accountId: process.env.WISE_ACCOUNT_ID ?? "@touygordondouglasphanchanas",
    currency: "THB",
    payUrl:
      process.env.WISE_PAY_URL ?? "https://wise.com/pay/me/touygordondouglasphanchanas",
    qrImage: "/images/payment/wise-qr.png",
    details:
      process.env.WISE_DETAILS ??
      "Wise tag: @touygordondouglasphanchanas\nReference: [Your invoice reference]",
    note: "Please include the invoice reference in the transfer details.",
  },
} as const;

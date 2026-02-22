/**
 * Manual payment providers: QR (PromptPay), Bank Transfer, Wise.
 * Instructions only - no processing. Admin approves after proof upload.
 */

import { paymentConfig } from "@/config/payments";
import type { PaymentProvider, PaymentInstructions } from "../PaymentProvider";
import { generatePromptPayQRPayload } from "../qr";

export const qrProvider: PaymentProvider = {
  type: "qr",
  isInstant: false,
  getInstructions(amount: number, currency: string, reference: string) {
    const payload = generatePromptPayQRPayload(amount, reference, paymentConfig.promptPayId);
    return {
      method: "qr",
      label: "Thai QR Code (PromptPay / Bank App)",
      payload,
      details: {
        amount: (amount / 100).toFixed(2),
        currency,
        reference,
      },
    };
  },
};

export const bankProvider: PaymentProvider = {
  type: "bank",
  isInstant: false,
  getInstructions(amount: number, currency: string, reference: string) {
    return {
      method: "bank",
      label: "Bank Transfer",
      details: {
        "Bank": paymentConfig.bank.name,
        "Branch": paymentConfig.bank.branch,
        "Account Name": paymentConfig.bank.accountName,
        "Account Number": paymentConfig.bank.accountNumber,
        "Amount": `${(amount / 100).toFixed(2)} ${currency}`,
        "Reference": reference,
      },
    };
  },
};

export const wiseProvider: PaymentProvider = {
  type: "wise",
  isInstant: false,
  getInstructions(amount: number, currency: string, reference: string) {
    return {
      method: "wise",
      label: "Wise (International Transfer)",
      details: {
        "Beneficiary": paymentConfig.wise.beneficiary,
        "Currency": paymentConfig.wise.currency,
        "Amount": `${(amount / 100).toFixed(2)} ${currency}`,
        "Reference": reference,
        "Details": paymentConfig.wise.details.replace("[Your invoice reference]", reference),
        "Note": paymentConfig.wise.note,
      },
    };
  },
};

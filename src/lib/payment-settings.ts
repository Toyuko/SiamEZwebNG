import { paymentConfig } from "@/config/payments";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface PaymentSettings {
  promptPayId: string;
  qrImagePath: string | null;
  bankName: string;
  bankBranch: string;
  bankAccountName: string;
  bankAccountNumber: string;
  wiseBeneficiary: string;
  wiseAccountId: string;
  wiseCurrency: string;
  wiseDetails: string;
  wiseNote: string;
}

const SETTINGS_KEY = "payment_details";

export function getDefaultPaymentSettings(): PaymentSettings {
  return {
    promptPayId: paymentConfig.promptPayId,
    qrImagePath: process.env.INVOICE_THAI_QR_IMAGE_PATH ?? null,
    bankName: paymentConfig.bank.name,
    bankBranch: paymentConfig.bank.branch,
    bankAccountName: paymentConfig.bank.accountName,
    bankAccountNumber: paymentConfig.bank.accountNumber,
    wiseBeneficiary: paymentConfig.wise.beneficiary,
    wiseAccountId: paymentConfig.wise.accountId,
    wiseCurrency: paymentConfig.wise.currency,
    wiseDetails: paymentConfig.wise.details,
    wiseNote: paymentConfig.wise.note,
  };
}

function asString(v: unknown, fallback: string) {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const defaults = getDefaultPaymentSettings();
  // In dev/CI it's possible for the running Prisma client instance to be stale
  // relative to the current schema (e.g., after adding the AppSetting model).
  // Avoid crashing the settings page in that case.
  const appSettingDelegate = (prisma as unknown as { appSetting?: { findUnique: Function } }).appSetting;
  if (!appSettingDelegate?.findUnique) return defaults;

  const row = await appSettingDelegate.findUnique({ where: { key: SETTINGS_KEY } });
  if (!row || !row.value || typeof row.value !== "object") {
    return defaults;
  }
  const v = row.value as Record<string, unknown>;
  return {
    promptPayId: asString(v.promptPayId, defaults.promptPayId),
    qrImagePath: typeof v.qrImagePath === "string" ? v.qrImagePath.trim() || null : defaults.qrImagePath,
    bankName: asString(v.bankName, defaults.bankName),
    bankBranch: asString(v.bankBranch, defaults.bankBranch),
    bankAccountName: asString(v.bankAccountName, defaults.bankAccountName),
    bankAccountNumber: asString(v.bankAccountNumber, defaults.bankAccountNumber),
    wiseBeneficiary: asString(v.wiseBeneficiary, defaults.wiseBeneficiary),
    wiseAccountId: asString(v.wiseAccountId, defaults.wiseAccountId),
    wiseCurrency: asString(v.wiseCurrency, defaults.wiseCurrency),
    wiseDetails: asString(v.wiseDetails, defaults.wiseDetails),
    wiseNote: asString(v.wiseNote, defaults.wiseNote),
  };
}

export async function savePaymentSettings(input: PaymentSettings) {
  const value = input as unknown as Prisma.InputJsonValue;
  const appSettingDelegate = (prisma as unknown as { appSetting?: { upsert: Function } }).appSetting;
  if (!appSettingDelegate?.upsert) {
    throw new Error("Payment settings storage is not available. Please regenerate Prisma client and restart.");
  }

  await appSettingDelegate.upsert({
    where: { key: SETTINGS_KEY },
    update: { value },
    create: { key: SETTINGS_KEY, value },
  });
}

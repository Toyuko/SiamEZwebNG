import { SYNTHETIC_EMAIL_DOMAIN } from "./types";

export function syntheticCustomerEmail(legacyId: number): string {
  return `legacy-customer-${legacyId}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

export function syntheticStaffEmail(legacyId: number): string {
  return `legacy-staff-${legacyId}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

export function normalizeEmail(email: string | null | undefined): string | null {
  const v = (email ?? "").trim().toLowerCase();
  if (!v || !v.includes("@")) return null;
  return v;
}

export function normalizePhone(phone: string | null | undefined): string | null {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 7) return null;
  if (digits.startsWith("0") && digits.length >= 9) {
    digits = `66${digits.slice(1)}`;
  }
  return digits;
}

export function splitName(full: string | null | undefined): { firstName: string; lastName: string } {
  const t = (full ?? "").trim().replace(/\s+/g, " ");
  if (!t) return { firstName: "", lastName: "" };
  const i = t.indexOf(" ");
  if (i === -1) return { firstName: t, lastName: "" };
  return { firstName: t.slice(0, i), lastName: t.slice(i + 1).trim() };
}

export function extractLineId(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(/\bline\s*(?:id)?\s*[:@]?\s*([@\w.\-]+)/i);
  return m?.[1] ?? null;
}

export function parseLegacyDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  const isoish = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const d = new Date(isoish);
  return Number.isNaN(d.getTime()) ? null : d;
}

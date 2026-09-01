import { DRIVER_LICENSE_PRICES } from "@/config/driver-license-price-guide";

export type LicenseServiceCategory = "conversion" | "renewal" | "apply_new" | "idp";
export type LicenseVehicleType = "bike" | "car" | "both";
export type ResidentialCertificatePlan = "self" | "need_help";

/** Share of total due at booking; remaining 75% is due after you get your license. */
export const DRIVER_LICENSE_DEPOSIT_PERCENT = 25;

export function computeDepositThb(totalThb: number): number {
  return Math.round((Math.max(0, totalThb) * DRIVER_LICENSE_DEPOSIT_PERCENT) / 100);
}

export function isYesAnswer(value: unknown): boolean {
  return value === true || value === "yes" || value === "true";
}

export function isNoAnswer(value: unknown): boolean {
  return value === false || value === "no" || value === "false";
}

/**
 * Fill category / residential add-on from the quote questions so pricing rules
 * and nested booking payloads stay consistent.
 */
export function normalizeDriverLicenseRequirements(
  requirements: Record<string, unknown>
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...requirements };
  const category = next.category;
  if (category !== "renewal" && category !== "idp") {
    if (isYesAnswer(next.hasForeignLicense)) next.category = "conversion";
    else if (isNoAnswer(next.hasForeignLicense)) next.category = "apply_new";
  }
  if (next.residentialCertificate === "need_help") {
    next.addonAddressCertificate = true;
  } else if (next.residentialCertificate === "self") {
    next.addonAddressCertificate = false;
  }
  return next;
}

export function computeBasePriceThb(
  category: LicenseServiceCategory,
  vehicle: LicenseVehicleType | null
): number {
  if (category === "idp") return DRIVER_LICENSE_PRICES.idp;
  if (!vehicle) return 0;
  switch (category) {
    case "conversion":
      return DRIVER_LICENSE_PRICES.conversion[vehicle];
    case "apply_new":
      return DRIVER_LICENSE_PRICES.newLicense[vehicle];
    case "renewal":
      return DRIVER_LICENSE_PRICES.renewal[vehicle];
    default:
      return 0;
  }
}

export type LicenseAddons = {
  translationLetter: boolean;
  addressCertificate: boolean;
};

export function computeAddonsTotalThb(addons: LicenseAddons): number {
  let t = 0;
  if (addons.translationLetter) t += DRIVER_LICENSE_PRICES.addons.translationLetter;
  if (addons.addressCertificate) t += DRIVER_LICENSE_PRICES.addons.residentialCertificate;
  return t;
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** First selectable weekday on or after (today + 3 calendar days), local time. */
export function getMinimumAppointmentDateString(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3);
  while (isWeekend(d)) {
    d.setDate(d.getDate() + 1);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseLocalDate(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const da = Number(m[3]);
  const d = new Date(y, mo, da);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== da) return null;
  return d;
}

/** True when `YYYY-MM-DD` falls on Saturday or Sunday (local). */
export function isWeekendYmd(dateStr: string): boolean {
  const d = parseLocalDate(dateStr);
  return d ? isWeekend(d) : false;
}

/**
 * Advance a local `YYYY-MM-DD` to the next weekday if it falls on a weekend.
 * Returns null for invalid input.
 */
export function toNearestWeekdayYmd(dateStr: string): string | null {
  const d = parseLocalDate(dateStr);
  if (!d) return null;
  while (isWeekend(d)) {
    d.setDate(d.getDate() + 1);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isValidDriverLicenseAppointmentDate(
  dateStr: string,
  minYmd: string
): "ok" | "required" | "weekend" | "too_soon" {
  if (!dateStr.trim()) return "required";
  const picked = parseLocalDate(dateStr);
  if (!picked || isWeekend(picked)) return "weekend";
  const min = parseLocalDate(minYmd);
  if (!min) return "too_soon";
  if (picked < min) return "too_soon";
  return "ok";
}

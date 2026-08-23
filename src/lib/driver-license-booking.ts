export type LicenseServiceCategory = "conversion" | "renewal" | "apply_new" | "idp";
export type LicenseVehicleType = "bike" | "car" | "both";
export type ResidentialCertificatePlan = "self" | "need_help";

/** Share of total due at booking; remaining 75% is due after you get your license. */
export const DRIVER_LICENSE_DEPOSIT_PERCENT = 25;

/** Conversion package when the customer has a foreign license and can obtain a residential certificate. */
export const SELF_CERT_CONVERSION_PRICE_THB = 8_000;

export function computeDepositThb(totalThb: number): number {
  return Math.round((Math.max(0, totalThb) * DRIVER_LICENSE_DEPOSIT_PERCENT) / 100);
}

export function isYesAnswer(value: unknown): boolean {
  return value === true || value === "yes" || value === "true";
}

export function isNoAnswer(value: unknown): boolean {
  return value === false || value === "no" || value === "false";
}

export function qualifiesForSelfCertConversionPrice(
  category: LicenseServiceCategory | string | null | undefined,
  hasForeignLicense: unknown,
  residentialCertificate: unknown
): boolean {
  if (category === "renewal" || category === "idp") return false;
  return isYesAnswer(hasForeignLicense) && residentialCertificate === "self";
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
  vehicle: LicenseVehicleType | null,
  answers: {
    hasForeignLicense?: unknown;
    residentialCertificate?: unknown;
  } = {}
): number {
  if (category === "idp") return 3500;
  if (
    qualifiesForSelfCertConversionPrice(
      category,
      answers.hasForeignLicense,
      answers.residentialCertificate
    )
  ) {
    return SELF_CERT_CONVERSION_PRICE_THB;
  }
  if (!vehicle) return 0;
  switch (category) {
    case "conversion":
    case "apply_new":
      if (vehicle === "bike") return 10_000;
      if (vehicle === "car") return 15_000;
      return 20_000;
    case "renewal":
      if (vehicle === "both") return 4500;
      return 3500;
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
  if (addons.translationLetter) t += 1500;
  if (addons.addressCertificate) t += 2500;
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

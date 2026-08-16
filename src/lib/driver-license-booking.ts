export type LicenseServiceCategory = "conversion" | "renewal" | "apply_new" | "idp";
export type LicenseVehicleType = "bike" | "car" | "both";

/** Share of total due at booking (remainder before DLT visit). */
export const DRIVER_LICENSE_DEPOSIT_PERCENT = 50;

export function computeDepositThb(totalThb: number): number {
  return Math.round((Math.max(0, totalThb) * DRIVER_LICENSE_DEPOSIT_PERCENT) / 100);
}

export function computeBasePriceThb(
  category: LicenseServiceCategory,
  vehicle: LicenseVehicleType | null
): number {
  if (category === "idp") return 3500;
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

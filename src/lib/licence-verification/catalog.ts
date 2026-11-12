import {
  DRIVER_LICENSE_PRICES,
  formatDriverLicensePriceThb,
} from "@/config/driver-license-price-guide";
import type { LicenceServiceKind, VehicleChoice } from "@/lib/licence-verification/types";

export const DRIVER_LICENSE_SERVICE_SLUG = "driver-license";

export type PricingCategory = "conversion" | "renewal" | "apply_new" | "idp" | "lost_replacement";

export function serviceGroup(
  kind: LicenceServiceKind
): "new_applicant" | "conversion" | "renewal" | "lost" | "idp" {
  if (kind.startsWith("NEW_")) return "new_applicant";
  if (kind.startsWith("CONVERSION_")) return "conversion";
  if (kind === "RENEWAL") return "renewal";
  if (kind === "LOST_REPLACEMENT") return "lost";
  return "idp";
}

export function vehicleForKind(
  kind: LicenceServiceKind,
  renewalVehicle: VehicleChoice | null
): VehicleChoice | null {
  if (kind === "NEW_CAR" || kind === "CONVERSION_CAR") return "car";
  if (kind === "NEW_MOTORCYCLE" || kind === "CONVERSION_MOTORCYCLE") return "bike";
  if (kind === "NEW_BOTH" || kind === "CONVERSION_BOTH") return "both";
  if (kind === "RENEWAL" || kind === "LOST_REPLACEMENT") return renewalVehicle;
  return null;
}

/** Map a pre-approval service onto the existing pricing-engine requirements. */
export function toDriverLicenseRequirements(
  kind: LicenceServiceKind,
  input: {
    renewalVehicle?: VehicleChoice | null;
    needsTranslation: boolean;
    hasResidenceCertificate: boolean;
  }
): { ok: true; requirements: Record<string, unknown> } | { ok: false; error: string } {
  const vehicle = vehicleForKind(kind, input.renewalVehicle ?? null);
  if ((kind === "RENEWAL" || kind === "LOST_REPLACEMENT") && !vehicle && kind === "RENEWAL") {
    return { ok: false, error: "Choose car, motorcycle, or both before pricing a renewal." };
  }

  const group = serviceGroup(kind);
  const category: PricingCategory =
    group === "new_applicant"
      ? "apply_new"
      : group === "conversion"
        ? "conversion"
        : group === "renewal"
          ? "renewal"
          : group === "lost"
            ? "lost_replacement"
            : "idp";

  const requirements: Record<string, unknown> = { category };
  if (category !== "idp" && category !== "lost_replacement" && vehicle) {
    requirements.vehicleType = vehicle;
  }
  if (category === "renewal" && vehicle) requirements.vehicleType = vehicle;
  if (category === "conversion") requirements.hasForeignLicense = "yes";
  if (category === "apply_new") requirements.hasForeignLicense = "no";
  if (input.needsTranslation) requirements.addonTranslationLetter = true;
  if (input.hasResidenceCertificate) requirements.residentialCertificate = "self";
  return { ok: true, requirements };
}

export function configuredFeeThb(
  kind: LicenceServiceKind,
  renewalVehicle: VehicleChoice | null
): number | null {
  const prices = DRIVER_LICENSE_PRICES;
  switch (kind) {
    case "NEW_CAR":
      return prices.newLicense.car;
    case "NEW_MOTORCYCLE":
      return prices.newLicense.bike;
    case "NEW_BOTH":
      return prices.newLicense.both;
    case "CONVERSION_CAR":
      return prices.conversion.car;
    case "CONVERSION_MOTORCYCLE":
      return prices.conversion.bike;
    case "CONVERSION_BOTH":
      return prices.conversion.both;
    case "IDP":
      return prices.idp;
    case "LOST_REPLACEMENT":
      return prices.addons.lostLicenseAddressUpdate;
    case "RENEWAL":
      return renewalVehicle ? prices.renewal[renewalVehicle] : null;
    default:
      return null;
  }
}

export function priceGuideLabel(
  kind: LicenceServiceKind,
  locale: string,
  renewalVehicle: VehicleChoice | null = null
): string {
  if (kind === "RENEWAL" && !renewalVehicle) {
    const values = [
      DRIVER_LICENSE_PRICES.renewal.car,
      DRIVER_LICENSE_PRICES.renewal.bike,
      DRIVER_LICENSE_PRICES.renewal.both,
    ];
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return formatDriverLicensePriceThb(min, locale);
    return `${formatDriverLicensePriceThb(min, locale)} – ${formatDriverLicensePriceThb(max, locale)}`;
  }
  const fee = configuredFeeThb(kind, renewalVehicle);
  if (fee == null) return "";
  return formatDriverLicensePriceThb(fee, locale);
}

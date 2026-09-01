import { describe, expect, it } from "vitest";
import { DRIVER_LICENSE_PRICES } from "@/config/driver-license-price-guide";
import {
  computeBasePriceThb,
  computeDepositThb,
  DRIVER_LICENSE_DEPOSIT_PERCENT,
  normalizeDriverLicenseRequirements,
} from "@/lib/driver-license-booking";

describe("driver license quote answers", () => {
  it("uses a 25% deposit", () => {
    expect(DRIVER_LICENSE_DEPOSIT_PERCENT).toBe(25);
    expect(computeDepositThb(4_500)).toBe(1_125);
    expect(computeDepositThb(15_000)).toBe(3_750);
  });

  it("applies flat conversion pricing for any vehicle type", () => {
    expect(computeBasePriceThb("conversion", "car")).toBe(DRIVER_LICENSE_PRICES.conversion.car);
    expect(computeBasePriceThb("conversion", "bike")).toBe(DRIVER_LICENSE_PRICES.conversion.bike);
    expect(computeBasePriceThb("conversion", "both")).toBe(DRIVER_LICENSE_PRICES.conversion.both);
  });

  it("derives conversion vs new license from the foreign-license question", () => {
    const converted = normalizeDriverLicenseRequirements({
      hasForeignLicense: "yes",
      residentialCertificate: "self",
      vehicleType: "car",
    });
    expect(converted.category).toBe("conversion");
    expect(converted.addonAddressCertificate).toBe(false);

    const fresh = normalizeDriverLicenseRequirements({
      hasForeignLicense: "no",
      residentialCertificate: "need_help",
      vehicleType: "bike",
    });
    expect(fresh.category).toBe("apply_new");
    expect(fresh.addonAddressCertificate).toBe(true);
  });

  it("does not override renewal or IDP from the foreign-license question", () => {
    expect(
      normalizeDriverLicenseRequirements({
        category: "renewal",
        hasForeignLicense: "yes",
        residentialCertificate: "self",
      }).category
    ).toBe("renewal");
    expect(computeBasePriceThb("renewal", "car")).toBe(DRIVER_LICENSE_PRICES.renewal.car);
    expect(computeBasePriceThb("idp", null)).toBe(DRIVER_LICENSE_PRICES.idp);
  });
});

import { describe, expect, it } from "vitest";
import {
  computeBasePriceThb,
  computeDepositThb,
  DRIVER_LICENSE_DEPOSIT_PERCENT,
  normalizeDriverLicenseRequirements,
  SELF_CERT_CONVERSION_PRICE_THB,
} from "@/lib/driver-license-booking";

describe("driver license quote answers", () => {
  it("uses a 25% deposit", () => {
    expect(DRIVER_LICENSE_DEPOSIT_PERCENT).toBe(25);
    expect(computeDepositThb(8_000)).toBe(2_000);
    expect(computeDepositThb(15_000)).toBe(3_750);
  });

  it("applies the self-cert conversion package regardless of vehicle type", () => {
    expect(
      computeBasePriceThb("conversion", "car", {
        hasForeignLicense: "yes",
        residentialCertificate: "self",
      })
    ).toBe(SELF_CERT_CONVERSION_PRICE_THB);
    expect(
      computeBasePriceThb("conversion", "both", {
        hasForeignLicense: "yes",
        residentialCertificate: "self",
      })
    ).toBe(SELF_CERT_CONVERSION_PRICE_THB);
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
    expect(
      computeBasePriceThb("renewal", "car", {
        hasForeignLicense: "yes",
        residentialCertificate: "self",
      })
    ).toBe(3500);
  });
});

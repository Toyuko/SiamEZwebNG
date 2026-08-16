import { describe, expect, it } from "vitest";
import {
  calculateQuote,
  computeQuoteExpiry,
  isQuoteExpired,
  thbToSatang,
} from "@/lib/pricing/engine";
import {
  basicTranslationPricing,
  constructionHandymanPricing,
  driverLicensePricing,
  marriageRegistrationPricing,
} from "@/config/pricing";
import { QuoteRequirementsSchema } from "@/lib/ai/quote-extract";

describe("pricing engine", () => {
  it("calculates base service only (driver license conversion car)", () => {
    const result = calculateQuote({
      config: driverLicensePricing,
      requirements: { category: "conversion", vehicleType: "car" },
    });
    expect(result.quoteType).toBe("calculated");
    expect(result.total).toBe(thbToSatang(15_000));
    expect(result.addOnsTotal).toBe(0);
    expect(result.lineItems).toHaveLength(1);
  });

  it("adds multiple add-ons", () => {
    const result = calculateQuote({
      config: driverLicensePricing,
      requirements: {
        category: "conversion",
        vehicleType: "car",
        addonTranslationLetter: true,
        addonAddressCertificate: true,
      },
    });
    expect(result.total).toBe(thbToSatang(15_000 + 1500 + 2500));
    expect(result.addOnsTotal).toBe(thbToSatang(1500 + 2500));
  });

  it("applies conditional pricing (marriage foreign + translation)", () => {
    const result = calculateQuote({
      config: marriageRegistrationPricing,
      requirements: {
        marriageType: "thai_foreign",
        needsTranslation: true,
      },
    });
    expect(result.total).toBe(thbToSatang(8500 + 2500 + 2500));
  });

  it("supports quantity / per-page fixed translation", () => {
    const result = calculateQuote({
      config: basicTranslationPricing,
      requirements: { pageCount: 3 },
    });
    expect(result.quoteType).toBe("fixed");
    expect(result.total).toBe(thbToSatang(1500));
  });

  it("includes estimated government fees separately", () => {
    const result = calculateQuote({
      config: marriageRegistrationPricing,
      requirements: {
        marriageType: "thai_thai",
        needsLegalization: true,
      },
    });
    expect(result.governmentFees).toBe(thbToSatang(3000));
    expect(
      result.lineItems.find((l) => l.id === "legalization")?.feeGuarantee
    ).toBe("estimated");
  });

  it("returns range quotes for construction", () => {
    const result = calculateQuote({
      config: constructionHandymanPricing,
      requirements: { jobType: "renovation", location: "Bangkok" },
    });
    expect(result.quoteType).toBe("range");
    expect(result.rangeMin).toBe(thbToSatang(80000));
    expect(result.rangeMax).toBe(thbToSatang(120000));
  });

  it("throws for invalid service requirements with no matching rules", () => {
    expect(() =>
      calculateQuote({
        config: driverLicensePricing,
        requirements: { category: "unknown" },
      })
    ).toThrow(/no applicable rules/);
  });

  it("detects expired quotes", () => {
    const past = new Date(Date.now() - 60_000);
    expect(isQuoteExpired(past)).toBe(true);
    const future = computeQuoteExpiry(14);
    expect(isQuoteExpired(future)).toBe(false);
  });
});

describe("AI quote requirements schema", () => {
  it("accepts valid structured extraction", () => {
    const parsed = QuoteRequirementsSchema.parse({
      serviceId: "driver-license",
      requirements: { category: "conversion", vehicleType: "car" },
      missingQuestions: ["nationality"],
      confidence: "medium",
    });
    expect(parsed.missingQuestions).toEqual(["nationality"]);
  });

  it("rejects malformed AI responses", () => {
    expect(() =>
      QuoteRequirementsSchema.parse({
        serviceId: 123,
        requirements: "nope",
        missingQuestions: "x",
      })
    ).toThrow();
  });
});

describe("admin override math", () => {
  it("applies discount adjustment to calculated total", () => {
    const calculated = calculateQuote({
      config: driverLicensePricing,
      requirements: { category: "conversion", vehicleType: "car" },
    });
    const original = calculated.total;
    const adjustment = thbToSatang(-500);
    const finalAmount = Math.max(0, original + adjustment);
    expect(finalAmount).toBe(thbToSatang(14_500));
  });
});

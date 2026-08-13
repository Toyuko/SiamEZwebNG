import { describe, expect, it } from "vitest";
import { submitVehicleLeadSchema } from "@/lib/vehicle-leads/schema";
import { buildDisplayTitle, leadHeadline, resolveMake } from "@/lib/vehicle-leads/display";
import { buildRuleBasedAnalysis, collectMissingSellFields, scoreLead } from "@/lib/vehicle-leads/analysis";
import {
  buildRuleBasedMarketingPackage,
  recommendSocialImages,
} from "@/lib/vehicle-leads/marketing";
import { computeVehicleServiceFee, getDefaultVehicleServicePricing } from "@/lib/vehicle-leads/pricing";

describe("vehicle lead validation", () => {
  it("requires phone or LINE for sell submissions", () => {
    const parsed = submitVehicleLeadSchema.safeParse({
      type: "sell",
      vehicle: { kind: "motorcycle", make: "Honda", model: "Forza 350", year: 2023 },
      contact: { customerName: "Alex Rider" },
      media: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a minimal sell lead with LINE only", () => {
    const parsed = submitVehicleLeadSchema.safeParse({
      type: "sell",
      vehicle: { kind: "motorcycle", make: "Honda", model: "Forza 350", year: 2023 },
      contact: { customerName: "Alex Rider", customerLineId: "alex.line" },
      media: [],
      source: "line",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects honeypot spam", () => {
    const parsed = submitVehicleLeadSchema.safeParse({
      type: "buy",
      vehicle: { kind: "car" },
      contact: { customerName: "Bot", customerPhone: "0812345678" },
      website: "http://spam.test",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("vehicle lead display", () => {
  it("builds a staff-friendly headline", () => {
    expect(
      leadHeadline({
        type: "sell",
        displayTitle: "Honda Forza 350",
        province: "Bangkok",
        askingPrice: 145000,
      })
    ).toContain("SELL VEHICLE");
  });

  it("uses manual make when Other is selected", () => {
    expect(resolveMake("Other", "GPX")).toBe("GPX");
  });

  it("titles a buy search without inventing a model", () => {
    const title = buildDisplayTitle({
      type: "buy",
      vehicle: { kind: "car" },
      contact: { customerName: "Sam", customerPhone: "0811111111" },
      media: [],
    });
    expect(title).toBe("Vehicle search");
  });
});

describe("vehicle AI analysis fallback", () => {
  it("does not invent a market price", () => {
    const analysis = buildRuleBasedAnalysis({
      type: "sell",
      displayTitle: "Honda Forza 350",
      vehicle: { make: "Honda", model: "Forza 350", year: 2023 },
      askingPrice: 145000,
      photoCount: 1,
      hasContact: true,
      recommendedFeeNote: "Fee TBD",
    });
    expect(analysis.estimatedMarketMin).toBeNull();
    expect(analysis.estimatedMarketMax).toBeNull();
    expect(analysis.isEstimate).toBe(true);
    expect(analysis.missingInformation.length).toBeGreaterThan(0);
  });

  it("scores incomplete sell leads as low/medium", () => {
    expect(
      scoreLead({
        type: "sell",
        missing: collectMissingSellFields({}),
        hasContact: true,
        hasPhotos: false,
        hasPrice: false,
      }).score
    ).toBe("low");
  });
});

describe("vehicle marketing privacy", () => {
  it("never recommends registration documents as social images", () => {
    const recs = recommendSocialImages([
      { id: "1", category: "registration", isPrivate: true, mediaType: "image" },
      { id: "2", category: "front", isPrivate: false, mediaType: "image" },
    ]);
    expect(recs.map((r) => r.mediaId)).toEqual(["2"]);
  });

  it("does not treat an unapproved asking price as official", () => {
    const pkg = buildRuleBasedMarketingPackage({
      language: "en",
      facts: {
        kind: "motorcycle",
        make: "Honda",
        model: "Forza 350",
        year: 2023,
        variant: null,
        engineSize: "350cc",
        transmission: "automatic",
        fuel: "gasoline",
        mileageKm: 18500,
        colour: "white",
        province: "Bangkok",
        city: null,
        overallCondition: "good",
        accidentHistory: "no",
        floodDamage: "no",
        modifications: null,
        serviceHistory: null,
        officialListingPrice: null,
        askingPrice: 145000,
      },
      media: [],
    });
    expect(pkg.priceIsOfficial).toBe(false);
    expect(pkg.priceLabel.toLowerCase()).toContain("not an approved");
    expect(pkg.facebook.post).not.toMatch(/081|line id|passport/i);
  });
});

describe("vehicle service fee config", () => {
  it("computes hybrid fees from admin settings, not hardcoded UI prices", () => {
    const pricing = {
      ...getDefaultVehicleServicePricing(),
      sellingFeeBaht: 5000,
      commissionPercent: 2,
      pricingMode: "hybrid" as const,
    };
    const fee = computeVehicleServiceFee({
      type: "sell",
      vehiclePriceBaht: 145000,
      pricing,
    });
    expect(fee.baseFee).toBe(5000);
    expect(fee.commission).toBe(2900);
    expect(fee.total).toBe(7900);
  });
});

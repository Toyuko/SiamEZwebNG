import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyEnhancements,
  buildDeterministicPropertyEnhancement,
  buildDeterministicVehicleEnhancement,
  enhanceListingDryRun,
  stripUnpairedSurrogates,
  truncate,
  type EnhancePrismaClient,
} from "@/lib/migration/enhance";
import { resolveListingMetadata, sliceDescriptionForMeta } from "@/lib/migration/metadata";

const findManyVehicle = vi.fn();
const findManyProperty = vi.fn();
const updateVehicle = vi.fn();
const updateProperty = vi.fn();
const updateManyVehicle = vi.fn();
const updateManyProperty = vi.fn();
const upsertEnhancement = vi.fn();

function createMockDb(): EnhancePrismaClient {
  return {
    salesVehicle: {
      findMany: findManyVehicle,
      update: updateVehicle,
      updateMany: updateManyVehicle,
    },
    salesProperty: {
      findMany: findManyProperty,
      update: updateProperty,
      updateMany: updateManyProperty,
    },
    listingEnhancement: {
      upsert: upsertEnhancement,
    },
  };
}

const sampleVehicle = {
  id: "clvehicle001aaaaaaaaaaaa",
  title: "Toyota Yaris 2019",
  description: "Clean city car with service history.\nLow mileage.",
  make: "Toyota",
  model: "Yaris",
  year: 2019,
  mileageKm: 42000,
  category: "car",
  priceAmount: 350000,
  priceCurrency: "THB",
  heroImageUrl: "https://example.com/y.jpg",
  specifications: { transmission: "auto", color: "white" },
};

const sampleProperty = {
  id: "clproperty001bbbbbbbbbbbb",
  title: "Phuket Villa",
  description: "Sea-view villa near the beach with private pool.",
  propertyType: "villa",
  listingType: "sale",
  province: "Phuket",
  district: "Kathu",
  neighborhood: "Kamala",
  bedrooms: 3,
  bathrooms: 2,
  areaSqm: 220,
  priceAmount: 12_000_000,
  priceCurrency: "THB",
  heroImageUrl: "https://example.com/p.jpg",
  specifications: { pool: "private" },
};

describe("listing enhancement writer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findManyVehicle.mockResolvedValue([sampleVehicle]);
    findManyProperty.mockResolvedValue([sampleProperty]);
    upsertEnhancement.mockImplementation(async ({ create }) => create);
  });

  it("deterministic builders never require mutating source description", () => {
    const now = new Date("2026-08-02T02:00:00.000Z");
    const vehiclePayload = buildDeterministicVehicleEnhancement(sampleVehicle, now);
    const propertyPayload = buildDeterministicPropertyEnhancement(sampleProperty, now);

    expect(vehiclePayload.listingId).toBe(sampleVehicle.id);
    expect(vehiclePayload.seoTitle).toContain("Toyota");
    expect(vehiclePayload.aiSummary.length).toBeGreaterThan(20);
    expect(vehiclePayload.keywords).toContain("toyota");
    expect(vehiclePayload.schemaJsonLd["@type"]).toEqual(["Product", "Vehicle"]);

    expect(propertyPayload.listingType).toBe("property");
    expect(propertyPayload.seoDescription).toMatch(/Phuket|villa|SiamEZ/i);
    expect(propertyPayload.schemaJsonLd["@type"]).toBe("RealEstateListing");

    // Source descriptions remain the caller's responsibility — builders only read them.
    expect(sampleVehicle.description).toBe("Clean city car with service history.\nLow mileage.");
    expect(sampleProperty.description).toBe("Sea-view villa near the beach with private pool.");
  });

  it("enhanceListingDryRun does not call vehicle/property update APIs", async () => {
    const db = createMockDb();
    const result = await enhanceListingDryRun({ db, useOpenAI: false });

    expect(result.mode).toBe("dry-run");
    expect(result.counts.total).toBe(2);
    expect(result.payloads).toHaveLength(2);
    expect(findManyVehicle).toHaveBeenCalledTimes(1);
    expect(findManyProperty).toHaveBeenCalledTimes(1);
    expect(updateVehicle).not.toHaveBeenCalled();
    expect(updateProperty).not.toHaveBeenCalled();
    expect(updateManyVehicle).not.toHaveBeenCalled();
    expect(updateManyProperty).not.toHaveBeenCalled();
    expect(upsertEnhancement).not.toHaveBeenCalled();
  });

  it("applyEnhancements upserts ListingEnhancement only (never source description)", async () => {
    const db = createMockDb();
    const originalVehicleDescription = sampleVehicle.description;
    const originalPropertyDescription = sampleProperty.description;

    const result = await applyEnhancements({ db, useOpenAI: false });

    expect(result.mode).toBe("apply");
    expect(result.upserted).toBe(2);
    expect(upsertEnhancement).toHaveBeenCalledTimes(2);

    for (const call of upsertEnhancement.mock.calls) {
      const args = call[0] as {
        where: { listingType_listingId: { listingType: string; listingId: string } };
        create: { listingId: string; seoTitle: string };
        update: { seoTitle: string; aiSummary: string };
      };
      expect(args.where.listingType_listingId.listingId).toMatch(/^cl/);
      expect(args.create.seoTitle).toBeTruthy();
      expect(args.update.aiSummary).toBeTruthy();
    }

    expect(updateVehicle).not.toHaveBeenCalled();
    expect(updateProperty).not.toHaveBeenCalled();
    expect(updateManyVehicle).not.toHaveBeenCalled();
    expect(updateManyProperty).not.toHaveBeenCalled();
    expect(sampleVehicle.description).toBe(originalVehicleDescription);
    expect(sampleProperty.description).toBe(originalPropertyDescription);
  });

  it("optional refineSummary only changes enhancement aiSummary fields", async () => {
    const db = createMockDb();
    const refineSummary = vi.fn(async () => "Refined SEO blurb about the listing.");

    const result = await enhanceListingDryRun({
      db,
      useOpenAI: true,
      refineSummary,
    });

    expect(refineSummary).toHaveBeenCalled();
    expect(result.usedOpenAI).toBe(true);
    expect(result.payloads.every((p) => p.aiSummary.includes("Refined SEO blurb"))).toBe(true);
    expect(updateVehicle).not.toHaveBeenCalled();
    expect(updateProperty).not.toHaveBeenCalled();
  });
});

describe("listing metadata fallback", () => {
  it("sliceDescriptionForMeta collapses whitespace and truncates", () => {
    expect(sliceDescriptionForMeta("  hello   world  ")).toBe("hello world");
    const long = "a".repeat(200);
    expect(sliceDescriptionForMeta(long).endsWith("…")).toBe(true);
    expect(sliceDescriptionForMeta(long).length).toBeLessThanOrEqual(160);
  });

  it("prefers enhancement seo fields then falls back to title/description", () => {
    const withEnhancement = resolveListingMetadata(
      { title: "Source Title", description: "Source description body for fallback." },
      { seoTitle: "Enhanced Title", seoDescription: "Enhanced description." }
    );
    expect(withEnhancement.title).toBe("Enhanced Title");
    expect(withEnhancement.description).toBe("Enhanced description.");
    expect(withEnhancement.usedEnhancementTitle).toBe(true);
    expect(withEnhancement.usedEnhancementDescription).toBe(true);

    const fallback = resolveListingMetadata(
      { title: "Source Title", description: "Source description body for fallback." },
      null
    );
    expect(fallback.title).toBe("Source Title");
    expect(fallback.description).toContain("Source description");
    expect(fallback.usedEnhancementTitle).toBe(false);
    expect(fallback.usedEnhancementDescription).toBe(false);
  });

  it("truncate never leaves unpaired emoji surrogates", () => {
    const emoji = "🔥"; // surrogate pair
    const padded = `${"a".repeat(158)}${emoji}${emoji}`;
    const out = truncate(padded, 160);
    expect(out.includes("\uD83D") && !out.includes("\uDD25")).toBe(false);
    expect(stripUnpairedSurrogates(out)).toBe(out);
    expect(JSON.stringify({ s: out })).toContain("…");
  });
});

import { describe, expect, it } from "vitest";
import { searchUnifiedSync } from "@/lib/ai/tools/search-unified";
import {
  buildPropertySearchDocument,
  buildSearchDocuments,
  buildServiceSearchDocument,
  buildVehicleSearchDocument,
  emptyGroupedSearchResults,
  groupSearchDocuments,
  queryUnifiedSearch,
} from "@/lib/search";
import {
  buildLocalizedPropertySearchPath,
  buildLocalizedServiceSearchPath,
  buildLocalizedVehicleSearchPath,
  buildPropertySearchPath,
  buildServiceBookPath,
  buildServiceSearchPath,
  buildVehicleSearchPath,
} from "@/lib/search/urls";

const vehicleId = "clxyz0123456789abcdefgh";
const propertyId = "clprop9876543210zyxwvuts";

const sampleDocs = buildSearchDocuments({
  services: [
    {
      slug: "driver-license",
      name: "Driver License",
      shortDescription: "Thai driving licence assistance",
      keywords: ["license", "dlt"],
    },
    {
      slug: "visa-services",
      name: "Visa Services",
      shortDescription: "Visa extensions and permits",
      keywords: ["visa", "immigration"],
    },
  ],
  vehicles: [
    {
      id: vehicleId,
      title: "Honda Wave 2020",
      make: "Honda",
      model: "Wave",
      year: 2020,
      category: "motorcycle",
    },
  ],
  properties: [
    {
      id: propertyId,
      title: "Sukhumvit Condo",
      propertyType: "condo",
      listingType: "sale",
      province: "Bangkok",
      district: "Watthana",
      neighborhood: "Sukhumvit",
    },
  ],
  includeHelp: true,
  locale: "en",
});

describe("unified search URL builders", () => {
  it("builds service and book paths from slug", () => {
    expect(buildServiceSearchPath("driver-license")).toBe("/services/driver-license");
    expect(buildServiceBookPath("driver-license")).toBe("/book/driver-license");
    expect(buildLocalizedServiceSearchPath("th", "visa-services")).toBe(
      "/th/services/visa-services"
    );
  });

  it("builds listing hits with cuid ids, never slug", () => {
    const vehicleSlug = "honda-wave-bargain";
    const propertySlug = "bangkok-condo-sukhumvit";

    expect(buildVehicleSearchPath(vehicleId)).toBe(`/sales/${vehicleId}`);
    expect(buildVehicleSearchPath(vehicleId)).not.toContain(vehicleSlug);
    expect(buildPropertySearchPath(propertyId)).toBe(`/real-estate/${propertyId}`);
    expect(buildPropertySearchPath(propertyId)).not.toContain(propertySlug);

    expect(buildLocalizedVehicleSearchPath("en", vehicleId)).toBe(`/en/sales/${vehicleId}`);
    expect(buildLocalizedPropertySearchPath("th", propertyId)).toBe(
      `/th/real-estate/${propertyId}`
    );
  });

  it("document builders embed cuid hrefs for listings", () => {
    const vehicle = buildVehicleSearchDocument({
      id: vehicleId,
      title: "Test Bike",
      make: "Yamaha",
      model: "Mio",
      year: 2019,
      category: "motorcycle",
    });
    const property = buildPropertySearchDocument({
      id: propertyId,
      title: "Test Condo",
      propertyType: "condo",
      listingType: "rent",
      province: "Chiang Mai",
    });
    const service = buildServiceSearchDocument({
      slug: "translation-services",
      name: "Translation",
    });

    expect(vehicle.href).toBe(`/sales/${vehicleId}`);
    expect(vehicle.listingId).toBe(vehicleId);
    expect(property.href).toBe(`/real-estate/${propertyId}`);
    expect(property.listingId).toBe(propertyId);
    expect(service.href).toBe("/services/translation-services");
  });

  it("rejects empty listing / service ids", () => {
    expect(() => buildVehicleSearchPath("")).toThrow(/cuid id/i);
    expect(() => buildPropertySearchPath("   ")).toThrow(/cuid id/i);
    expect(() => buildServiceSearchPath("")).toThrow(/slug/i);
  });
});

describe("unified search grouping", () => {
  it("partitions documents into typed groups", () => {
    const groups = groupSearchDocuments(sampleDocs);
    expect(groups.services.length).toBeGreaterThanOrEqual(2);
    expect(groups.vehicles).toHaveLength(1);
    expect(groups.properties).toHaveLength(1);
    expect(groups.help.length).toBeGreaterThan(0);
    expect(groups.vehicles[0]?.listingId).toBe(vehicleId);
    expect(groups.properties[0]?.href).toBe(`/real-estate/${propertyId}`);
  });

  it("query returns typed groups for a cross-division term", () => {
    const groups = queryUnifiedSearch(sampleDocs, "honda", { limitPerGroup: 5 });
    expect(groups.vehicles.some((v) => v.listingId === vehicleId)).toBe(true);
    expect(groups.services.every((s) => s.division === "service")).toBe(true);
    expect(groups.properties.every((p) => p.division === "property")).toBe(true);
  });

  it("finds services and help stubs", () => {
    const license = queryUnifiedSearch(sampleDocs, "driver license bangkok");
    expect(license.services.some((s) => s.slug === "driver-license")).toBe(true);

    const contact = queryUnifiedSearch(sampleDocs, "contact support");
    expect(contact.help.some((h) => h.href === "/contact")).toBe(true);
  });
});

describe("unified search empty / no-crash", () => {
  it("empty query returns empty groups without throwing", () => {
    expect(queryUnifiedSearch(sampleDocs, "")).toEqual(emptyGroupedSearchResults());
    expect(queryUnifiedSearch(sampleDocs, "   ")).toEqual(emptyGroupedSearchResults());
    expect(queryUnifiedSearch([], "anything")).toEqual(emptyGroupedSearchResults());
  });

  it("nullish query and malformed docs do not crash", () => {
    // @ts-expect-error intentional nullish query
    expect(() => queryUnifiedSearch(sampleDocs, null)).not.toThrow();
    // @ts-expect-error intentional invalid documents
    expect(() => queryUnifiedSearch(undefined, "honda")).not.toThrow();
    expect(queryUnifiedSearch(sampleDocs, "zzzz-no-match-xyz")).toEqual(
      emptyGroupedSearchResults()
    );
  });

  it("concierge sync tool wraps empty query safely", () => {
    const result = searchUnifiedSync(sampleDocs, { query: "", locale: "en" });
    expect(result.total).toBe(0);
    expect(result.groups).toEqual(emptyGroupedSearchResults());
    expect(result.pathTemplates.vehicle).toBe("/sales/[id]");
    expect(result.pathTemplates.property).toBe("/real-estate/[id]");
  });

  it("concierge sync tool returns listing cuid paths", () => {
    const result = searchUnifiedSync(sampleDocs, {
      query: "sukhumvit condo",
      locale: "en",
      limitPerGroup: 3,
    });
    expect(result.groups.properties[0]?.href).toBe(`/real-estate/${propertyId}`);
    expect(result.groups.properties[0]?.href).not.toContain("bangkok-condo");
  });
});

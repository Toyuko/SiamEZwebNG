import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MigrationPrismaClient } from "@/lib/migration/analyze";
import {
  buildMigrationReport,
  formatMigrationReportMarkdown,
  writeInventoryReportDryRun,
} from "@/lib/migration/report";
import { analyzePublishedListings } from "@/lib/migration/analyze";

const findManyVehicle = vi.fn();
const findManyProperty = vi.fn();
const updateVehicle = vi.fn();
const updateProperty = vi.fn();
const deleteVehicle = vi.fn();
const deleteProperty = vi.fn();
const updateManyVehicle = vi.fn();
const updateManyProperty = vi.fn();
const deleteManyVehicle = vi.fn();
const deleteManyProperty = vi.fn();

function createMockDb(): MigrationPrismaClient & {
  salesVehicle: MigrationPrismaClient["salesVehicle"] & {
    update: typeof updateVehicle;
    delete: typeof deleteVehicle;
    updateMany: typeof updateManyVehicle;
    deleteMany: typeof deleteManyVehicle;
  };
  salesProperty: MigrationPrismaClient["salesProperty"] & {
    update: typeof updateProperty;
    delete: typeof deleteProperty;
    updateMany: typeof updateManyProperty;
    deleteMany: typeof deleteManyProperty;
  };
} {
  return {
    salesVehicle: {
      findMany: findManyVehicle,
      update: updateVehicle,
      delete: deleteVehicle,
      updateMany: updateManyVehicle,
      deleteMany: deleteManyVehicle,
    },
    salesProperty: {
      findMany: findManyProperty,
      update: updateProperty,
      delete: deleteProperty,
      updateMany: updateManyProperty,
      deleteMany: deleteManyProperty,
    },
  };
}

const sampleVehicle = {
  id: "clvehicle001aaaaaaaaaaaa",
  slug: "toyota-yaris-2019",
  title: "Toyota Yaris 2019",
  make: "Toyota",
  model: "Yaris",
  year: 2019,
  category: "car",
  status: "available",
  published: true,
  priceAmount: 350000,
  priceCurrency: "THB",
  heroImageUrl: "https://example.com/y.jpg",
  imageUrls: ["https://example.com/y.jpg"],
  videoUrls: [],
  sellerKind: "private",
  isBoosted: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

const sampleProperty = {
  id: "clproperty001bbbbbbbbbbbb",
  slug: "phuket-villa-sea",
  title: "Phuket Villa",
  propertyType: "villa",
  listingType: "sale",
  province: "Phuket",
  status: "available",
  published: true,
  priceAmount: 12_000_000,
  priceCurrency: "THB",
  heroImageUrl: "https://example.com/p.jpg",
  imageUrls: ["https://example.com/p.jpg", "https://example.com/p2.jpg"],
  videoUrls: null,
  sellerKind: "dealer",
  isBoosted: true,
  createdAt: new Date("2026-01-03T00:00:00.000Z"),
  updatedAt: new Date("2026-01-04T00:00:00.000Z"),
};

describe("migration dry-run inventory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findManyVehicle.mockResolvedValue([sampleVehicle]);
    findManyProperty.mockResolvedValue([sampleProperty]);
  });

  it("analyzePublishedListings only calls findMany (no update/delete)", async () => {
    const db = createMockDb();
    const result = await analyzePublishedListings({ db });

    expect(result.vehicles).toHaveLength(1);
    expect(result.properties).toHaveLength(1);
    expect(result.all).toHaveLength(2);
    expect(result.vehicles[0]?.id).toBe(sampleVehicle.id);
    expect(result.properties[0]?.summary).toContain("villa");

    expect(findManyVehicle).toHaveBeenCalledTimes(1);
    expect(findManyProperty).toHaveBeenCalledTimes(1);
    expect(updateVehicle).not.toHaveBeenCalled();
    expect(updateProperty).not.toHaveBeenCalled();
    expect(deleteVehicle).not.toHaveBeenCalled();
    expect(deleteProperty).not.toHaveBeenCalled();
    expect(updateManyVehicle).not.toHaveBeenCalled();
    expect(updateManyProperty).not.toHaveBeenCalled();
    expect(deleteManyVehicle).not.toHaveBeenCalled();
    expect(deleteManyProperty).not.toHaveBeenCalled();
  });

  it("writeInventoryReportDryRun writes markdown without prisma mutations", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "siamez-m0-"));
    const db = createMockDb();
    const now = new Date("2026-08-02T01:00:00.000Z");

    try {
      const report = await writeInventoryReportDryRun({
        db,
        cwd: tmp,
        outputDir: "docs/siamez-2.0/migrations",
        now,
        write: true,
      });

      expect(report.mode).toBe("dry-run");
      expect(report.counts.total).toBe(2);
      expect(report.counts.vehicles).toBe(1);
      expect(report.counts.properties).toBe(1);
      expect(report.outputPath).toContain("inventory-20260802T010000Z.md");

      const markdown = await readFile(report.outputPath!, "utf8");
      expect(markdown).toContain(`/sales/${sampleVehicle.id}`);
      expect(markdown).toContain(`/real-estate/${sampleProperty.id}`);
      expect(markdown).not.toContain(`/sales/${sampleVehicle.slug}`);
      expect(markdown).not.toContain(`/real-estate/${sampleProperty.slug}`);
      expect(markdown).toContain("no listing source fields were updated or deleted");

      expect(updateVehicle).not.toHaveBeenCalled();
      expect(updateProperty).not.toHaveBeenCalled();
      expect(deleteVehicle).not.toHaveBeenCalled();
      expect(deleteProperty).not.toHaveBeenCalled();
      expect(updateManyVehicle).not.toHaveBeenCalled();
      expect(updateManyProperty).not.toHaveBeenCalled();
      expect(deleteManyVehicle).not.toHaveBeenCalled();
      expect(deleteManyProperty).not.toHaveBeenCalled();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it("supports empty inventory (empty DB)", async () => {
    findManyVehicle.mockResolvedValue([]);
    findManyProperty.mockResolvedValue([]);
    const db = createMockDb();

    const analysis = await analyzePublishedListings({ db });
    const report = buildMigrationReport(analysis, {
      generatedAt: new Date("2026-08-02T00:00:00.000Z"),
      outputPath: null,
    });
    const md = formatMigrationReportMarkdown(report);

    expect(report.counts.total).toBe(0);
    expect(md).toContain("| Total published | 0 |");
    expect(updateVehicle).not.toHaveBeenCalled();
    expect(deleteProperty).not.toHaveBeenCalled();
  });
});

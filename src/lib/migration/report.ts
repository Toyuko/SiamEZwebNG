import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { analyzePublishedListings, type AnalyzePublishedListingsOptions } from "@/lib/migration/analyze";
import {
  buildRealEstateListingPath,
  buildSalesListingPath,
} from "@/lib/migration/urls";
import type {
  AnalyzePublishedListingsResult,
  ListingSnapshot,
  MigrationReport,
  MigrationReportCounts,
} from "@/lib/migration/types";

export const DEFAULT_MIGRATIONS_DIR = "docs/siamez-2.0/migrations";

function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function buildCounts(listings: ListingSnapshot[]): MigrationReportCounts {
  const vehicles = listings.filter((l) => l.division === "sales").length;
  const properties = listings.filter((l) => l.division === "real-estate").length;
  return {
    vehicles,
    properties,
    total: listings.length,
    withMedia: listings.filter((l) => l.imageCount > 0 || l.videoCount > 0 || Boolean(l.heroImageUrl)).length,
    boosted: listings.filter((l) => l.isBoosted).length,
  };
}

function publicPathFor(listing: ListingSnapshot): string {
  return listing.division === "sales"
    ? buildSalesListingPath(listing)
    : buildRealEstateListingPath(listing);
}

function renderListingTable(listings: ListingSnapshot[], division: ListingSnapshot["division"]): string {
  const rows = listings.filter((l) => l.division === division);
  if (rows.length === 0) {
    return "_None_\n";
  }

  const header =
    "| id | title | status | price | media | boosted | public path |\n" +
    "|----|-------|--------|-------|-------|---------|-------------|\n";
  const body = rows
    .map((l) => {
      const price = `${l.priceAmount} ${l.priceCurrency}`;
      const media = `${l.imageCount} img / ${l.videoCount} vid`;
      const pathCell = publicPathFor(l);
      const title = l.title.replace(/\|/g, "\\|");
      return `| \`${l.id}\` | ${title} | ${l.status} | ${price} | ${media} | ${l.isBoosted ? "yes" : "no"} | \`${pathCell}\` |`;
    })
    .join("\n");

  return `${header}${body}\n`;
}

/** Pure markdown renderer — no DB writes. */
export function formatMigrationReportMarkdown(report: MigrationReport): string {
  const iso = report.generatedAt.toISOString();
  const lines = [
    "# Platform 2.0 — Listing inventory report (dry-run)",
    "",
    `**Generated:** ${iso}`,
    `**Mode:** \`${report.mode}\``,
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `|--------|------:|`,
    `| Vehicles (SalesVehicle) | ${report.counts.vehicles} |`,
    `| Properties (SalesProperty) | ${report.counts.properties} |`,
    `| Total published | ${report.counts.total} |`,
    `| With media | ${report.counts.withMedia} |`,
    `| Boosted | ${report.counts.boosted} |`,
    "",
    "## URL contract",
    "",
    "- Vehicle detail: `/sales/{cuid}` — **id only, never slug**",
    "- Property detail: `/real-estate/{cuid}` — **id only, never slug**",
    "",
    "## Vehicles",
    "",
    renderListingTable(report.listings, "sales"),
    "",
    "## Properties",
    "",
    renderListingTable(report.listings, "real-estate"),
    "",
    "## Notes",
    "",
    ...(report.notes.length > 0
      ? report.notes.map((n) => `- ${n}`)
      : ["- (none)"]),
    "",
    "---",
    "",
    "_M0 Migration Engine dry-run: no listing source fields were updated or deleted._",
    "",
  ];

  return lines.join("\n");
}

export function buildMigrationReport(
  analysis: AnalyzePublishedListingsResult,
  options: { generatedAt?: Date; outputPath?: string | null; notes?: string[] } = {}
): MigrationReport {
  const generatedAt = options.generatedAt ?? new Date();
  return {
    generatedAt,
    mode: "dry-run",
    outputPath: options.outputPath ?? null,
    counts: buildCounts(analysis.all),
    listings: analysis.all,
    notes: options.notes ?? [
      "Dry-run only — Prisma update/delete were not invoked.",
      "Enhancement tables are deferred to Wave M1.",
    ],
  };
}

export type WriteInventoryReportOptions = AnalyzePublishedListingsOptions & {
  /** Repo root used to resolve the migrations directory. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Override output directory (relative to cwd or absolute). */
  outputDir?: string;
  /** Fixed timestamp for deterministic filenames in tests. */
  now?: Date;
  /** When false, skip writing to disk and only return the in-memory report. */
  write?: boolean;
};

/**
 * Dry-run inventory: analyze published listings and optionally write a
 * timestamped markdown report under docs/siamez-2.0/migrations/.
 * Never mutates SalesVehicle / SalesProperty source rows.
 */
export async function writeInventoryReportDryRun(
  options: WriteInventoryReportOptions = {}
): Promise<MigrationReport> {
  const analysis = await analyzePublishedListings({ db: options.db });
  const now = options.now ?? new Date();
  const cwd = options.cwd ?? process.cwd();
  const outputDir = path.resolve(cwd, options.outputDir ?? DEFAULT_MIGRATIONS_DIR);
  const filename = `inventory-${formatTimestamp(now)}.md`;
  const outputPath = path.join(outputDir, filename);

  const report = buildMigrationReport(analysis, {
    generatedAt: now,
    outputPath: options.write === false ? null : outputPath,
  });

  if (options.write === false) {
    return report;
  }

  await mkdir(outputDir, { recursive: true });
  const markdown = formatMigrationReportMarkdown(report);
  await writeFile(outputPath, markdown, "utf8");
  return report;
}

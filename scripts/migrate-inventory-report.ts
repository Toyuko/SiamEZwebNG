/**
 * Platform 2.0 M0 — dry-run listing inventory report.
 *
 * Usage:
 *   npx tsx scripts/migrate-inventory-report.ts
 *   npm run migrate:inventory-report
 *
 * Non-destructive: reads SalesVehicle + SalesProperty only; writes markdown
 * under docs/siamez-2.0/migrations/. Never updates or deletes listing rows.
 */

import path from "node:path";
import { writeInventoryReportDryRun } from "../src/lib/migration/report";

async function main() {
  const cwd = process.cwd();
  console.log("[migrate:inventory-report] dry-run starting…");
  console.log(`[migrate:inventory-report] cwd=${cwd}`);

  const report = await writeInventoryReportDryRun({ cwd, write: true });

  console.log("[migrate:inventory-report] summary");
  console.log(`  vehicles:   ${report.counts.vehicles}`);
  console.log(`  properties: ${report.counts.properties}`);
  console.log(`  total:      ${report.counts.total}`);
  console.log(`  withMedia:  ${report.counts.withMedia}`);
  console.log(`  boosted:    ${report.counts.boosted}`);

  if (report.outputPath) {
    console.log(`[migrate:inventory-report] wrote ${path.relative(cwd, report.outputPath)}`);
  }

  console.log("[migrate:inventory-report] done (no listing mutations).");
}

main().catch((error) => {
  console.error("[migrate:inventory-report] failed:", error);
  process.exitCode = 1;
});

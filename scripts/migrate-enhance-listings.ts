/**
 * Platform 2.0 M1 — listing enhancement writer (SEO / AI side-fields).
 *
 * Usage:
 *   npm run migrate:enhance-listings              # dry-run (default)
 *   npm run migrate:enhance-listings -- --dry-run
 *   npm run migrate:enhance-listings -- --apply
 *   npx tsx scripts/migrate-enhance-listings.ts --apply
 *
 * Non-destructive: upserts ListingEnhancement only. Never updates
 * SalesVehicle / SalesProperty title, description, images, or price.
 */

import { applyEnhancements, enhanceListingDryRun } from "../src/lib/migration/enhance";

function parseArgs(argv: string[]) {
  const apply = argv.includes("--apply");
  const dryRunFlag = argv.includes("--dry-run");
  // Default is dry-run; --apply opts in to writes. --dry-run wins if both present.
  const dryRun = dryRunFlag || !apply;
  return { dryRun, apply: !dryRun };
}

async function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));
  const mode = dryRun ? "dry-run" : "apply";

  console.log(`[migrate:enhance-listings] mode=${mode}`);
  if (process.env.OPENAI_API_KEY?.trim()) {
    console.log("[migrate:enhance-listings] OPENAI_API_KEY detected — may refine aiSummary");
  } else {
    console.log("[migrate:enhance-listings] no OPENAI_API_KEY — deterministic templates");
  }

  const result = dryRun ? await enhanceListingDryRun() : await applyEnhancements();

  console.log("[migrate:enhance-listings] summary");
  console.log(`  vehicles:   ${result.counts.vehicles}`);
  console.log(`  properties: ${result.counts.properties}`);
  console.log(`  total:      ${result.counts.total}`);
  console.log(`  usedOpenAI: ${result.usedOpenAI}`);
  if (result.mode === "apply") {
    console.log(`  upserted:   ${result.upserted}`);
  }

  for (const note of result.notes) {
    console.log(`  note: ${note}`);
  }

  if (dryRun && result.payloads.length > 0) {
    const sample = result.payloads[0]!;
    console.log("[migrate:enhance-listings] sample payload");
    console.log(`  ${sample.listingType}/${sample.listingId}`);
    console.log(`  seoTitle: ${sample.seoTitle}`);
    console.log(`  seoDescription: ${sample.seoDescription}`);
  }

  console.log(
    dryRun
      ? "[migrate:enhance-listings] done (dry-run; no ListingEnhancement writes)."
      : "[migrate:enhance-listings] done (ListingEnhancement upserted; source listings untouched)."
  );
}

main().catch((error) => {
  console.error("[migrate:enhance-listings] failed:", error);
  process.exitCode = 1;
});

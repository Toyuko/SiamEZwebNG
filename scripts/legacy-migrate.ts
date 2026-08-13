/**
 * Legacy siam-ez.com admin → SiamEZwebNG data migration.
 *
 * Default is extract + transform + validate + dry-run import (no destination writes).
 *
 *   npx tsx scripts/legacy-migrate.ts
 *   npx tsx scripts/legacy-migrate.ts extract
 *   npx tsx scripts/legacy-migrate.ts all --dry-run
 *   npx tsx scripts/legacy-migrate.ts import --apply --allow-production --i-understand-this-writes-to-the-destination-database
 *
 * Never mutates the legacy PHP admin. Extract uses GET only.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_EXTRACT_DIR,
  extractLegacyAdmin,
  transformLegacyExtract,
  validateTransformedBundle,
  importTransformedBundle,
  isLocalDatabaseUrl,
  snapshotDestination,
  reconcile,
  buildReportCounts,
  formatMigrationReportText,
  detectDuplicates,
  type DestinationUserLite,
  type LegacyExtract,
} from "../src/lib/legacy-migration";

function arg(flag: string): boolean {
  return process.argv.includes(flag);
}

function phase(): string {
  const raw = process.argv[2];
  if (!raw || raw.startsWith("-")) return "all";
  return raw;
}

async function loadExtract(dir: string): Promise<LegacyExtract> {
  const raw = await readFile(path.join(dir, "extract.json"), "utf8");
  return JSON.parse(raw) as LegacyExtract;
}

async function main() {
  const cmd = phase();
  const dryRun = !arg("--apply");
  const allowProduction = arg("--allow-production") && arg("--i-understand-this-writes-to-the-destination-database");
  const outDir = DEFAULT_EXTRACT_DIR;
  const notes: string[] = [];

  console.log(`[legacy-migrate] phase=${cmd} dryRun=${dryRun}`);

  if (cmd === "extract" || cmd === "all") {
    const { extract, checksum } = await extractLegacyAdmin({ write: true, outDir });
    console.log(
      `[legacy-migrate] extracted clients=${extract.clients.length} jobs=${extract.jobs.length} orders=${extract.orders.length} sha256=${checksum.slice(0, 12)}…`
    );
    notes.push("Legacy source was read with HTTP GET only; no PHP records were updated or deleted.");
  }

  if (cmd === "extract") return;

  const extract = await loadExtract(outDir);
  const { bundle, duplicates, money } = transformLegacyExtract(extract);

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "transformed.json"), `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  await writeFile(path.join(outDir, "duplicates.json"), `${JSON.stringify(duplicates, null, 2)}\n`, "utf8");

  if (cmd === "transform") {
    console.log(`[legacy-migrate] transformed customers=${bundle.customers.length} cases=${bundle.cases.length}`);
    return;
  }

  const issues = validateTransformedBundle(bundle);
  const errors = issues.filter((i) => i.severity === "error");
  console.log(`[legacy-migrate] validation errors=${errors.length} warnings=${issues.length - errors.length}`);
  if (cmd === "validate") {
    for (const issue of issues.slice(0, 30)) {
      console.log(`  ${issue.severity} ${issue.entity} ${issue.legacyId ?? ""} ${issue.message}`);
    }
    if (errors.length) process.exitCode = 1;
    return;
  }

  if (errors.length && arg("--apply")) {
    console.error("[legacy-migrate] refusing --apply because validation errors exist");
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  let destinationUsers: DestinationUserLite[] = [];
  try {
    destinationUsers = await prisma.user.findMany({
      where: { role: "customer" },
      select: { id: true, email: true, name: true, phone: true, legacyCustomerId: true },
    });
  } catch {
    try {
      const rows = await prisma.user.findMany({
        where: { role: "customer" },
        select: { id: true, email: true, name: true, phone: true },
      });
      destinationUsers = rows.map((u) => ({ ...u, legacyCustomerId: null }));
      notes.push(
        "Destination schema is missing legacy_customer_id (migration 20260812200000 not applied yet). Duplicate scan used email/phone/name only."
      );
    } catch (error) {
      notes.push(
        `Destination duplicate scan skipped: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`
      );
    }
  }

  const destDuplicates = detectDuplicates({ clients: extract.clients, destinationUsers });
  await writeFile(
    path.join(outDir, "destination-duplicates.json"),
    `${JSON.stringify(destDuplicates, null, 2)}\n`,
    "utf8"
  );

  if (cmd === "import" || cmd === "all") {
    if (!dryRun) {
      const dbUrl = process.env.DATABASE_URL;
      if (!isLocalDatabaseUrl(dbUrl) && !allowProduction) {
        console.error(
          "[legacy-migrate] refusing --apply: DATABASE_URL is not localhost. Take a Neon backup, then re-run with --allow-production --i-understand-this-writes-to-the-destination-database"
        );
        process.exitCode = 1;
        await prisma.$disconnect();
        return;
      }
      notes.push(
        isLocalDatabaseUrl(dbUrl)
          ? "Import targeted a local database."
          : "Import targeted a non-local DATABASE_URL after explicit production confirmation flags."
      );
    }

    const importResult = await importTransformedBundle(prisma, bundle, { dryRun });
    await writeFile(path.join(outDir, "mappings.json"), `${JSON.stringify(importResult.mappings, null, 2)}\n`, "utf8");

    let reconciliation = null;
    if (!dryRun) {
      try {
        const snap = await snapshotDestination(prisma);
        reconciliation = reconcile(bundle, money, snap);
      } catch (error) {
        notes.push(`Reconciliation snapshot failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const counts = buildReportCounts({
      extract,
      bundle,
      money,
      duplicates: destDuplicates,
      issues,
      importResult,
      reconciliation,
    });
    const text = formatMigrationReportText({
      counts,
      money,
      duplicates: destDuplicates,
      issues,
      dryRun,
      notes: [
        ...notes,
        `Attachments in legacy assets.php: ${extract.assetsCount}`,
        `Legal documents in legacy legal.php: ${extract.legalDocumentsCount}`,
        "Passwords were not migrated. Customers with real emails can use password reset after import.",
      ],
    });
    await writeFile(path.join(outDir, "MIGRATION-REPORT.txt"), `${text}\n`, "utf8");
    const publicReport = path.join(process.cwd(), "docs", "siamez-2.0", "LEGACY-DATA-MIGRATION-RUN.txt");
    await writeFile(publicReport, `${text}\n`, "utf8");
    console.log(text);
    if (reconciliation && !reconciliation.ok) {
      console.error("[legacy-migrate] reconciliation mismatch — investigate before treating this as complete");
      process.exitCode = 1;
    }
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("[legacy-migrate] failed:", error);
  process.exitCode = 1;
});

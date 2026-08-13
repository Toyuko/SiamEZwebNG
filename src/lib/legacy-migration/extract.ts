import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { LEGACY_ADMIN_DEFAULT_BASE, type LegacyExtract } from "./types";

export const DEFAULT_EXTRACT_DIR = path.join(process.cwd(), "data", "legacy-extract");

function apiUrl(base: string, file: string, query = ""): string {
  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root}api/${file}${query}`;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json", "User-Agent": "SiamEZ-legacy-migration/1.0" },
  });
  if (!res.ok) {
    throw new Error(`GET ${url} failed: HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

async function fetchAllOrders(base: string) {
  const orders: unknown[] = [];
  let offset = 0;
  const pageSize = 200;
  let total = Infinity;
  while (offset < total) {
    const data = await getJson<{ orders?: unknown[]; total?: number }>(
      apiUrl(base, "payments.php", `?limit=${pageSize}&offset=${offset}`)
    );
    const batch = data.orders ?? [];
    orders.push(...batch);
    total = data.total ?? orders.length;
    if (batch.length === 0) break;
    offset += batch.length;
  }
  return orders;
}

export async function extractLegacyAdmin(options?: {
  sourceBaseUrl?: string;
  outDir?: string;
  write?: boolean;
}): Promise<{ extract: LegacyExtract; outDir: string; checksum: string }> {
  const sourceBaseUrl = options?.sourceBaseUrl ?? process.env.LEGACY_ADMIN_BASE_URL ?? LEGACY_ADMIN_DEFAULT_BASE;
  const outDir = options?.outDir ?? DEFAULT_EXTRACT_DIR;

  const [dashboard, clients, jobs, services, staff, operations, calendar, assets, legal, orders] =
    await Promise.all([
      getJson<Record<string, unknown>>(apiUrl(sourceBaseUrl, "dashboard.php")).catch(() => null),
      getJson<{ clients?: unknown[] }>(apiUrl(sourceBaseUrl, "clients.php")),
      getJson<{ jobs?: unknown[] }>(apiUrl(sourceBaseUrl, "jobs.php")),
      getJson<{ services?: unknown[] }>(apiUrl(sourceBaseUrl, "services.php")),
      getJson<{ staff?: unknown[] }>(apiUrl(sourceBaseUrl, "staff.php")),
      getJson<{ bookings?: unknown[] }>(apiUrl(sourceBaseUrl, "operations.php")),
      getJson<{ events?: unknown[] }>(apiUrl(sourceBaseUrl, "calendar.php")),
      getJson<{ assets?: unknown[]; documents?: number }>(apiUrl(sourceBaseUrl, "assets.php")),
      getJson<{ documents?: unknown[] }>(apiUrl(sourceBaseUrl, "legal.php")),
      fetchAllOrders(sourceBaseUrl),
    ]);

  const extract: LegacyExtract = {
    extractedAt: new Date().toISOString(),
    sourceBaseUrl,
    dashboard,
    clients: (clients.clients ?? []) as LegacyExtract["clients"],
    jobs: (jobs.jobs ?? []) as LegacyExtract["jobs"],
    orders: orders as LegacyExtract["orders"],
    services: (services.services ?? []) as LegacyExtract["services"],
    staff: (staff.staff ?? []) as LegacyExtract["staff"],
    calendarEvents: (calendar.events ?? []) as LegacyExtract["calendarEvents"],
    assetsCount: Array.isArray(assets.assets) ? assets.assets.length : Number(assets.documents ?? 0),
    legalDocumentsCount: Array.isArray(legal.documents) ? legal.documents.length : 0,
  };

  const payload = JSON.stringify(extract);
  const checksum = createHash("sha256").update(payload).digest("hex");

  if (options?.write !== false) {
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "extract.json"), `${payload}\n`, "utf8");
    await writeFile(
      path.join(outDir, "extract-meta.json"),
      `${JSON.stringify(
        {
          extractedAt: extract.extractedAt,
          sourceBaseUrl,
          checksumSha256: checksum,
          counts: {
            clients: extract.clients.length,
            jobs: extract.jobs.length,
            orders: extract.orders.length,
            services: extract.services.length,
            staff: extract.staff.length,
            calendarEvents: extract.calendarEvents.length,
            assets: extract.assetsCount,
            legalDocuments: extract.legalDocumentsCount,
            operationsBookings: (operations.bookings ?? []).length,
          },
          httpMethods: ["GET"],
          mutatedSource: false,
        },
        null,
        2
      )}\n`,
      "utf8"
    );
  }

  return { extract, outDir, checksum };
}

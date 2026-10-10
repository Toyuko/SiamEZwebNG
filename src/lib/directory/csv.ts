import { EXAMPLE_CSV_SLUG, isVerificationStatus } from "@/lib/directory/constants";
import { isHttpUrl, isThailandCoordinate } from "@/lib/directory/maps";
import { resolveProvinceCode } from "@/lib/directory/provinces";
import { digitsOnly } from "@/lib/directory/search";

export const DIRECTORY_CSV_COLUMNS = [
  "slug",
  "name_en",
  "name_th",
  "category_slug",
  "parent_organization_en",
  "parent_organization_th",
  "branch_name_en",
  "branch_name_th",
  "keywords",
  "province_code",
  "district",
  "subdistrict",
  "address_en",
  "address_th",
  "postal_code",
  "latitude",
  "longitude",
  "google_maps_url",
  "extra_map_urls",
  "phone_primary",
  "phones",
  "email",
  "website",
  "facebook_url",
  "contact_notes",
  "opening_hours",
  "operating_days",
  "lunch_break",
  "holiday_notes",
  "appointment_required",
  "walk_ins_accepted",
  "appointment_notes",
  "service_slugs",
  "service_notes",
  "documents_required",
  "booking_info",
  "government_links",
  "internal_notes",
  "procedural_notes",
  "staff_tips",
  "parking_notes",
  "counter_notes",
  "verification_status",
  "source_url",
  "source_notes",
  "last_verified_at",
  "last_verification_method",
  "reliability_notes",
] as const;

export type DirectoryCsvColumn = (typeof DIRECTORY_CSV_COLUMNS)[number];

export type CsvCellError = { column: string; message: string };

export type CsvPreviewRow = {
  rowNumber: number;
  values: Record<string, string>;
  errors: CsvCellError[];
  warnings: string[];
  action: "import" | "update" | "skip" | "reject";
  duplicateOf?: string;
};

export type ExistingOfficeKey = {
  id: string;
  slug: string;
  nameEn: string;
  provinceCode: string;
  phonePrimary: string | null;
};

export type CsvPreview = {
  headerErrors: string[];
  rows: CsvPreviewRow[];
  summary: {
    total: number;
    ready: number;
    updates: number;
    skipped: number;
    rejected: number;
  };
};

const REQUIRED_HEADERS: DirectoryCsvColumn[] = ["name_en", "name_th", "category_slug", "province_code"];

export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function parseCsv(text: string): string[][] {
  const source = stripBom(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    cell += char;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.trim() !== "")) rows.push(row);
  }
  return rows;
}

function excelSafe(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) return `'${value}`;
  return value;
}

function escapeCell(value: string): string {
  const safe = excelSafe(value);
  if (/[",\n]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

export function toCsv(rows: Array<Record<string, string>>): string {
  const lines = [
    DIRECTORY_CSV_COLUMNS.join(","),
    ...rows.map((row) => DIRECTORY_CSV_COLUMNS.map((column) => escapeCell(row[column] ?? "")).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function csvTemplate(): string {
  const example: Record<string, string> = {
    slug: EXAMPLE_CSV_SLUG,
    name_en: "EXAMPLE — delete this row",
    name_th: "ตัวอย่าง — ลบแถวนี้",
    category_slug: "dlt",
    province_code: "50",
    keywords: "DLT|Land Transport",
    verification_status: "unverified",
    source_notes: "Example only. Leave unknown contact fields blank. Do not invent telephone numbers.",
  };
  return toCsv([example]);
}

function headerIndex(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((header, index) => {
    map.set(header.trim().toLowerCase(), index);
  });
  return map;
}

function cell(row: string[], index: Map<string, number>, column: string): string {
  const at = index.get(column);
  if (at == null) return "";
  return (row[at] ?? "").trim();
}

function listCell(value: string): string[] {
  return value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function previewDirectoryCsv(input: {
  csv: string;
  knownCategorySlugs: string[];
  knownServiceSlugs: string[];
  existing: ExistingOfficeKey[];
  updateExisting?: boolean;
}): CsvPreview {
  if (input.csv.includes("\u0000")) {
    return {
      headerErrors: ["This file looks like UTF-16. Save it as UTF-8 CSV and upload again."],
      rows: [],
      summary: { total: 0, ready: 0, updates: 0, skipped: 0, rejected: 0 },
    };
  }
  const table = parseCsv(input.csv);
  if (table.length === 0) {
    return {
      headerErrors: ["The file is empty."],
      rows: [],
      summary: { total: 0, ready: 0, updates: 0, skipped: 0, rejected: 0 },
    };
  }
  const headers = table[0]?.map((header) => header.trim().toLowerCase()) ?? [];
  const index = headerIndex(headers);
  const headerErrors: string[] = [];
  for (const required of REQUIRED_HEADERS) {
    if (!index.has(required)) headerErrors.push(`Missing column: ${required}`);
  }
  const unknown = headers.filter(
    (header) => header && !(DIRECTORY_CSV_COLUMNS as readonly string[]).includes(header)
  );
  if (unknown.length) headerErrors.push(`Ignored unknown columns: ${unknown.join(", ")}`);
  if (headerErrors.some((error) => error.startsWith("Missing column"))) {
    return {
      headerErrors,
      rows: [],
      summary: { total: 0, ready: 0, updates: 0, skipped: 0, rejected: 0 },
    };
  }

  const categories = new Set(input.knownCategorySlugs);
  const services = new Set(input.knownServiceSlugs);
  const bySlug = new Map(input.existing.map((office) => [office.slug.toLowerCase(), office]));
  const seenSlugs = new Set<string>();
  const seenNames = new Set<string>();
  const rows: CsvPreviewRow[] = [];

  for (let i = 1; i < table.length; i += 1) {
    const raw = table[i] ?? [];
    const values: Record<string, string> = {};
    for (const column of DIRECTORY_CSV_COLUMNS) values[column] = cell(raw, index, column);
    const errors: CsvCellError[] = [];
    const warnings: string[] = [];
    const rowNumber = i + 1;

    if (values.slug === EXAMPLE_CSV_SLUG) {
      rows.push({
        rowNumber,
        values,
        errors: [],
        warnings: ["Example row skipped."],
        action: "skip",
      });
      continue;
    }

    if (!values.name_en && !values.name_th) {
      errors.push({ column: "name_en", message: "Enter an English or Thai office name" });
    }
    if (!values.name_en) warnings.push("English name is blank.");
    if (!values.name_th) warnings.push("Thai name is blank.");

    if (!categories.has(values.category_slug)) {
      errors.push({ column: "category_slug", message: "Unknown category slug" });
    }
    const province = resolveProvinceCode(values.province_code);
    if (!province) {
      errors.push({ column: "province_code", message: "Unknown province. Use a code such as 50 or a province name." });
    } else {
      values.province_code = province;
    }

    const lat = values.latitude;
    const lng = values.longitude;
    if ((lat && !lng) || (!lat && lng)) {
      errors.push({ column: "latitude", message: "Enter both latitude and longitude, or leave both blank" });
    } else if (lat && lng) {
      const latitude = Number(lat);
      const longitude = Number(lng);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !isThailandCoordinate(latitude, longitude)) {
        errors.push({ column: "latitude", message: "Coordinates must be numbers inside Thailand" });
      }
    }

    for (const column of ["google_maps_url", "website", "facebook_url", "source_url"] as const) {
      if (values[column] && !isHttpUrl(values[column])) {
        errors.push({ column, message: "Must be an http(s) URL" });
      }
    }
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      errors.push({ column: "email", message: "Enter a valid email" });
    }
    for (const slug of listCell(values.service_slugs)) {
      if (!services.has(slug)) {
        errors.push({ column: "service_slugs", message: `Unknown service slug: ${slug}` });
      }
    }
    for (const url of listCell(values.extra_map_urls)) {
      if (!isHttpUrl(url)) errors.push({ column: "extra_map_urls", message: "Map links must be http(s) URLs" });
    }

    if (values.verification_status && !isVerificationStatus(values.verification_status)) {
      errors.push({ column: "verification_status", message: "Unknown verification status" });
    }
    if (values.verification_status === "verified") {
      values.verification_status = "needs_verification";
      warnings.push("Imported rows are not marked verified. Status was changed to needs verification.");
    }
    if (!values.verification_status) values.verification_status = "unverified";

    if (values.last_verified_at && Number.isNaN(Date.parse(values.last_verified_at))) {
      errors.push({ column: "last_verified_at", message: "Use an ISO date such as 2026-10-10" });
    }

    const slugKey = values.slug.toLowerCase();
    const nameKey = `${(values.name_en || values.name_th).toLowerCase()}|${values.province_code}`;
    let duplicateOf: string | undefined;
    if (slugKey && seenSlugs.has(slugKey)) {
      errors.push({ column: "slug", message: "Duplicate slug in this file" });
    }
    if (seenNames.has(nameKey)) {
      warnings.push("Another row in this file has the same name and province.");
    }
    if (slugKey) seenSlugs.add(slugKey);
    seenNames.add(nameKey);

    const existing =
      (slugKey && bySlug.get(slugKey)) ||
      input.existing.find(
        (office) =>
          office.provinceCode === values.province_code &&
          office.nameEn.toLowerCase() === (values.name_en || values.name_th).toLowerCase()
      ) ||
      (values.phone_primary
        ? input.existing.find(
            (office) =>
              office.phonePrimary &&
              digitsOnly(office.phonePrimary) === digitsOnly(values.phone_primary) &&
              office.provinceCode === values.province_code
          )
        : undefined);

    if (existing) duplicateOf = existing.slug;

    let action: CsvPreviewRow["action"] = "import";
    if (errors.length) action = "reject";
    else if (existing && input.updateExisting) action = "update";
    else if (existing) {
      action = "skip";
      warnings.push(`Matches existing office “${existing.slug}”. It will not be overwritten.`);
    }

    rows.push({ rowNumber, values, errors, warnings, action, duplicateOf });
  }

  return {
    headerErrors,
    rows,
    summary: {
      total: rows.length,
      ready: rows.filter((row) => row.action === "import").length,
      updates: rows.filter((row) => row.action === "update").length,
      skipped: rows.filter((row) => row.action === "skip").length,
      rejected: rows.filter((row) => row.action === "reject").length,
    },
  };
}

export function csvRowToRecord(values: Record<string, string>): Record<string, string> {
  const record: Record<string, string> = {};
  for (const column of DIRECTORY_CSV_COLUMNS) record[column] = values[column] ?? "";
  return record;
}

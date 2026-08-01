/**
 * Platform 2.0 Wave M1 — listing enhancement writer.
 *
 * Generates SEO meta + short summaries from EXISTING listing fields.
 * Writes ONLY to `ListingEnhancement` (idempotent upsert).
 * NEVER updates SalesVehicle.description / SalesProperty.description
 * (or title, images, price).
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PUBLIC_REAL_ESTATE_INVENTORY_STATUSES } from "@/data-access/real-estate";
import { PUBLIC_SALES_INVENTORY_STATUSES } from "@/data-access/sales";
import { buildPropertyJsonLd, buildVehicleJsonLd } from "@/lib/migration/jsonld";
import { sliceDescriptionForMeta } from "@/lib/migration/metadata";
import type {
  ApplyEnhancementsResult,
  EnhanceListingsDryRunResult,
  EnhancementPayload,
  ListingEnhancementType,
} from "@/lib/migration/types";

function asInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

const SEO_TITLE_MAX = 70;
const AI_SUMMARY_MAX = 320;

type VehicleEnhanceRow = {
  id: string;
  title: string;
  description: string;
  make: string;
  model: string;
  year: number;
  mileageKm: number;
  category: string;
  priceAmount: number;
  priceCurrency: string;
  heroImageUrl: string;
  specifications: unknown;
};

type PropertyEnhanceRow = {
  id: string;
  title: string;
  description: string;
  propertyType: string;
  listingType: string;
  province: string;
  district: string | null;
  neighborhood: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqm: number;
  priceAmount: number;
  priceCurrency: string;
  heroImageUrl: string;
  specifications: unknown;
};

export type EnhancePrismaClient = {
  salesVehicle: {
    findMany: typeof prisma.salesVehicle.findMany;
    update?: (...args: unknown[]) => Promise<unknown>;
    updateMany?: (...args: unknown[]) => Promise<unknown>;
  };
  salesProperty: {
    findMany: typeof prisma.salesProperty.findMany;
    update?: (...args: unknown[]) => Promise<unknown>;
    updateMany?: (...args: unknown[]) => Promise<unknown>;
  };
  listingEnhancement: {
    upsert: typeof prisma.listingEnhancement.upsert;
    findUnique?: typeof prisma.listingEnhancement.findUnique;
  };
};

export type EnhanceListingsOptions = {
  db?: EnhancePrismaClient;
  /** Injected clock for tests. */
  now?: Date;
  /** Force/skip OpenAI refinement (default: use OPENAI_API_KEY if set). */
  useOpenAI?: boolean;
  /** Optional OpenAI refine implementation for tests. */
  refineSummary?: (input: {
    listingType: ListingEnhancementType;
    title: string;
    summary: string;
  }) => Promise<string>;
};

function truncate(text: string, max: number): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) return collapsed;
  return `${collapsed.slice(0, max - 1).trimEnd()}…`;
}

function uniqueKeywords(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const token = value?.trim().toLowerCase();
    if (!token || seen.has(token)) continue;
    seen.add(token);
    out.push(token);
    if (out.length >= 12) break;
  }
  return out;
}

function specsKeywords(specifications: unknown): string[] {
  if (!specifications || typeof specifications !== "object" || Array.isArray(specifications)) {
    return [];
  }
  return Object.entries(specifications as Record<string, unknown>)
    .flatMap(([key, value]) => {
      if (typeof value === "string" || typeof value === "number") {
        return [`${key}`, String(value)];
      }
      return [key];
    })
    .slice(0, 8);
}

/** Deterministic SEO/summary payload from existing listing fields (no paid AI). */
export function buildDeterministicVehicleEnhancement(
  row: VehicleEnhanceRow,
  now: Date
): EnhancementPayload {
  const priceLabel = `${row.priceAmount.toLocaleString("en-US")} ${row.priceCurrency}`;
  const seoTitle = truncate(
    `${row.title} | ${row.year} ${row.make} ${row.model} for sale`,
    SEO_TITLE_MAX
  );
  const aiSummary = truncate(
    `${row.year} ${row.make} ${row.model} (${row.category}) with ${row.mileageKm.toLocaleString("en-US")} km. Listed at ${priceLabel}. ${sliceDescriptionForMeta(row.description, 180)}`,
    AI_SUMMARY_MAX
  );
  const seoDescription = sliceDescriptionForMeta(
    `${aiSummary} Browse vehicles with SiamEZ.`,
    160
  );
  const keywords = uniqueKeywords([
    row.make,
    row.model,
    String(row.year),
    row.category,
    "thailand",
    "vehicle",
    "for sale",
    ...specsKeywords(row.specifications),
  ]);
  const schemaJsonLd = buildVehicleJsonLd(
    {
      id: row.id,
      title: row.title,
      description: row.description,
      make: row.make,
      model: row.model,
      year: row.year,
      mileageKm: row.mileageKm,
      priceAmount: row.priceAmount,
      priceCurrency: row.priceCurrency,
      heroImageUrl: row.heroImageUrl,
      category: row.category,
    },
    { summary: aiSummary }
  );

  return {
    listingType: "vehicle",
    listingId: row.id,
    aiSummary,
    seoTitle,
    seoDescription,
    keywords,
    schemaJsonLd,
    enhancedAt: now,
  };
}

/** Deterministic SEO/summary payload from existing property fields (no paid AI). */
export function buildDeterministicPropertyEnhancement(
  row: PropertyEnhanceRow,
  now: Date
): EnhancementPayload {
  const priceLabel = `${row.priceAmount.toLocaleString("en-US")} ${row.priceCurrency}`;
  const location = [row.neighborhood, row.district, row.province].filter(Boolean).join(", ");
  const beds = row.bedrooms != null ? `${row.bedrooms} bed` : null;
  const seoTitle = truncate(
    `${row.title} | ${row.propertyType} for ${row.listingType} in ${row.province}`,
    SEO_TITLE_MAX
  );
  const aiSummary = truncate(
    `${row.propertyType} for ${row.listingType} in ${location || row.province}` +
      (beds ? `, ${beds}` : "") +
      `, ${row.areaSqm} sqm. Listed at ${priceLabel}. ${sliceDescriptionForMeta(row.description, 160)}`,
    AI_SUMMARY_MAX
  );
  const seoDescription = sliceDescriptionForMeta(
    `${aiSummary} Explore real estate with SiamEZ.`,
    160
  );
  const keywords = uniqueKeywords([
    row.propertyType,
    row.listingType,
    row.province,
    row.district,
    row.neighborhood,
    "thailand",
    "real estate",
    beds,
    ...specsKeywords(row.specifications),
  ]);
  const schemaJsonLd = buildPropertyJsonLd(
    {
      id: row.id,
      title: row.title,
      description: row.description,
      propertyType: row.propertyType,
      listingType: row.listingType,
      province: row.province,
      district: row.district,
      neighborhood: row.neighborhood,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      areaSqm: row.areaSqm,
      priceAmount: row.priceAmount,
      priceCurrency: row.priceCurrency,
      heroImageUrl: row.heroImageUrl,
    },
    { summary: aiSummary }
  );

  return {
    listingType: "property",
    listingId: row.id,
    aiSummary,
    seoTitle,
    seoDescription,
    keywords,
    schemaJsonLd,
    enhancedAt: now,
  };
}

async function defaultOpenAIRefine(input: {
  listingType: ListingEnhancementType;
  title: string;
  summary: string;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return input.summary;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 180,
      messages: [
        {
          role: "system",
          content:
            "Refine the marketplace listing summary for SEO. Keep facts; do not invent prices or specs. Max 280 characters. Return plain text only.",
        },
        {
          role: "user",
          content: `Type: ${input.listingType}\nTitle: ${input.title}\nSummary:\n${input.summary}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI refine failed: HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const refined = data.choices?.[0]?.message?.content?.trim();
  return refined ? truncate(refined, AI_SUMMARY_MAX) : input.summary;
}

async function maybeRefinePayloads(
  payloads: EnhancementPayload[],
  options: EnhanceListingsOptions
): Promise<{ payloads: EnhancementPayload[]; usedOpenAI: boolean; notes: string[] }> {
  const notes: string[] = [];
  const wantOpenAI =
    options.useOpenAI ?? Boolean(process.env.OPENAI_API_KEY?.trim() || options.refineSummary);

  if (!wantOpenAI) {
    notes.push("Deterministic templates only (no OPENAI_API_KEY).");
    return { payloads, usedOpenAI: false, notes };
  }

  const refine = options.refineSummary ?? defaultOpenAIRefine;
  const refined: EnhancementPayload[] = [];
  let usedOpenAI = false;

  for (const payload of payloads) {
    try {
      const aiSummary = await refine({
        listingType: payload.listingType,
        title: payload.seoTitle,
        summary: payload.aiSummary,
      });
      usedOpenAI = true;
      const seoDescription = sliceDescriptionForMeta(
        `${aiSummary} ${payload.listingType === "vehicle" ? "Browse vehicles" : "Explore real estate"} with SiamEZ.`,
        160
      );
      refined.push({
        ...payload,
        aiSummary,
        seoDescription,
        schemaJsonLd: {
          ...payload.schemaJsonLd,
          description: aiSummary.slice(0, 5000),
        },
      });
    } catch (error) {
      notes.push(
        `OpenAI refine skipped for ${payload.listingType}/${payload.listingId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      refined.push(payload);
    }
  }

  if (usedOpenAI) {
    notes.push("OpenAI refinement applied to aiSummary (enhancement fields only).");
  }

  return { payloads: refined, usedOpenAI, notes };
}

async function loadSources(db: EnhancePrismaClient): Promise<{
  vehicles: VehicleEnhanceRow[];
  properties: PropertyEnhanceRow[];
}> {
  const [vehicles, properties] = await Promise.all([
    db.salesVehicle.findMany({
      where: {
        published: true,
        status: { in: PUBLIC_SALES_INVENTORY_STATUSES },
      },
      select: {
        id: true,
        title: true,
        description: true,
        make: true,
        model: true,
        year: true,
        mileageKm: true,
        category: true,
        priceAmount: true,
        priceCurrency: true,
        heroImageUrl: true,
        specifications: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    db.salesProperty.findMany({
      where: {
        published: true,
        status: { in: PUBLIC_REAL_ESTATE_INVENTORY_STATUSES },
      },
      select: {
        id: true,
        title: true,
        description: true,
        propertyType: true,
        listingType: true,
        province: true,
        district: true,
        neighborhood: true,
        bedrooms: true,
        bathrooms: true,
        areaSqm: true,
        priceAmount: true,
        priceCurrency: true,
        heroImageUrl: true,
        specifications: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    vehicles: vehicles as VehicleEnhanceRow[],
    properties: properties as PropertyEnhanceRow[],
  };
}

function toPayloads(
  vehicles: VehicleEnhanceRow[],
  properties: PropertyEnhanceRow[],
  now: Date
): EnhancementPayload[] {
  return [
    ...vehicles.map((row) => buildDeterministicVehicleEnhancement(row, now)),
    ...properties.map((row) => buildDeterministicPropertyEnhancement(row, now)),
  ];
}

function countPayloads(payloads: EnhancementPayload[]) {
  const vehicles = payloads.filter((p) => p.listingType === "vehicle").length;
  const properties = payloads.filter((p) => p.listingType === "property").length;
  return { vehicles, properties, total: payloads.length };
}

/**
 * Dry-run: build enhancement payloads from existing listings. No DB writes.
 * Does not call SalesVehicle/SalesProperty update APIs.
 */
export async function enhanceListingDryRun(
  options: EnhanceListingsOptions = {}
): Promise<EnhanceListingsDryRunResult> {
  const db = options.db ?? (prisma as EnhancePrismaClient);
  const now = options.now ?? new Date();
  const { vehicles, properties } = await loadSources(db);
  const base = toPayloads(vehicles, properties, now);
  const { payloads, usedOpenAI, notes } = await maybeRefinePayloads(base, options);

  return {
    mode: "dry-run",
    payloads,
    counts: countPayloads(payloads),
    usedOpenAI,
    notes: [
      "Dry-run only — ListingEnhancement rows were not written.",
      "Source SalesVehicle / SalesProperty description fields were not updated.",
      ...notes,
    ],
  };
}

/**
 * Apply: idempotent upsert into ListingEnhancement only.
 * NEVER updates SalesVehicle or SalesProperty rows.
 */
export async function applyEnhancements(
  options: EnhanceListingsOptions = {}
): Promise<ApplyEnhancementsResult> {
  const db = options.db ?? (prisma as EnhancePrismaClient);
  const now = options.now ?? new Date();
  const dryRun = await enhanceListingDryRun({ ...options, db, now });
  let upserted = 0;

  for (const payload of dryRun.payloads) {
    await db.listingEnhancement.upsert({
      where: {
        listingType_listingId: {
          listingType: payload.listingType,
          listingId: payload.listingId,
        },
      },
      create: {
        listingType: payload.listingType,
        listingId: payload.listingId,
        aiSummary: payload.aiSummary,
        seoTitle: payload.seoTitle,
        seoDescription: payload.seoDescription,
        keywords: asInputJson(payload.keywords),
        schemaJsonLd: asInputJson(payload.schemaJsonLd),
        enhancedAt: payload.enhancedAt,
      },
      update: {
        aiSummary: payload.aiSummary,
        seoTitle: payload.seoTitle,
        seoDescription: payload.seoDescription,
        keywords: asInputJson(payload.keywords),
        schemaJsonLd: asInputJson(payload.schemaJsonLd),
        enhancedAt: payload.enhancedAt,
      },
    });
    upserted += 1;
  }

  return {
    mode: "apply",
    payloads: dryRun.payloads,
    counts: dryRun.counts,
    upserted,
    usedOpenAI: dryRun.usedOpenAI,
    notes: [
      `Upserted ${upserted} ListingEnhancement row(s).`,
      "Source SalesVehicle / SalesProperty description fields were not updated.",
      ...dryRun.notes.filter((n) => !n.startsWith("Dry-run only")),
    ],
  };
}

export async function getListingEnhancement(
  listingType: ListingEnhancementType,
  listingId: string,
  db: Pick<EnhancePrismaClient, "listingEnhancement"> = prisma as EnhancePrismaClient
) {
  if (!db.listingEnhancement.findUnique) {
    return null;
  }
  try {
    return await db.listingEnhancement.findUnique({
      where: {
        listingType_listingId: { listingType, listingId },
      },
    });
  } catch (error) {
    console.warn("ListingEnhancement lookup unavailable:", error);
    return null;
  }
}

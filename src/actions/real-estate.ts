"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

/** Absolute http(s) URL or site-root path. */
const propertyImageSrcSchema = z
  .string()
  .min(2)
  .refine(
    (val) => {
      if (val.startsWith("/")) {
        return val.length > 1 && !val.includes("..");
      }
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Image URL must be absolute http(s) or a root-relative path" }
  );

const listingSchema = z
  .object({
    title: z.string().min(3),
    propertyType: z.enum(["condo", "house", "townhouse", "land", "commercial", "villa"]),
    listingType: z.enum(["sale", "rent"]).default("sale"),
    bedrooms: z.number().int().min(0).nullable().optional(),
    bathrooms: z.number().int().min(0).nullable().optional(),
    areaSqm: z.number().int().min(1),
    landAreaSqm: z.number().int().min(0).nullable().optional(),
    floor: z.number().int().min(0).nullable().optional(),
    yearBuilt: z
      .number()
      .int()
      .min(1900)
      .max(new Date().getFullYear() + 1)
      .nullable()
      .optional(),
    province: z.string().min(1),
    district: z.string().nullable().optional(),
    neighborhood: z.string().nullable().optional(),
    priceAmount: z.number().int().min(1),
    priceCurrency: z.string().min(3).max(3).default("THB"),
    sellerKind: z.enum(["dealer", "private"]).default("private"),
    status: z.enum(["available", "reserved", "sold", "pending_boost"]),
    furnished: z.enum(["unfurnished", "partially", "furnished", "not_applicable"]).default("not_applicable"),
    heroMediaType: z.enum(["image", "video"]).default("image"),
    heroImageUrl: propertyImageSrcSchema,
    heroVideoUrl: z.string().url().nullable().optional().default(null),
    imageUrls: z.array(propertyImageSrcSchema).default([]),
    videoUrls: z.array(z.string().url()).optional().default([]),
    description: z.string().min(20),
    specifications: z.record(z.string(), z.string()).optional(),
    published: z.boolean().default(true),
    isBoosted: z.boolean().default(false),
    boostExpiresAt: z.coerce.date().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.imageUrls.length === 0 && value.videoUrls.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one image or video is required",
        path: ["imageUrls"],
      });
    }

    if (value.heroMediaType === "video" && !value.heroVideoUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "heroVideoUrl is required when heroMediaType is video",
        path: ["heroVideoUrl"],
      });
    }

    if (value.heroMediaType === "image" && !value.heroImageUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "heroImageUrl is required when heroMediaType is image",
        path: ["heroImageUrl"],
      });
    }
  });

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function ensureStaffAccess() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

function canManageListing(
  session: Awaited<ReturnType<typeof ensureStaffAccess>>,
  createdById: string | null
) {
  if (session.user.role === "admin" || session.user.role === "staff") {
    return true;
  }
  return createdById === session.user.id;
}

async function ensureUniqueSlug(base: string, excludeId?: string) {
  let slug = base || `property-${Date.now()}`;
  let suffix = 1;
  while (true) {
    const found = await prisma.salesProperty.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!found) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

function normalizeBoostFields(parsed: z.infer<typeof listingSchema>) {
  if (!parsed.isBoosted) {
    return { isBoosted: false, boostExpiresAt: null as Date | null, boostTier: null as string | null };
  }
  const boostExpiresAt =
    parsed.boostExpiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return {
    isBoosted: true,
    boostExpiresAt,
    boostTier: "manual" as string | null,
  };
}

export async function createSalesPropertyListing(input: z.infer<typeof listingSchema>) {
  const session = await ensureStaffAccess();
  const parsed = listingSchema.parse(input);
  const slug = await ensureUniqueSlug(
    toSlug(`${parsed.propertyType}-${parsed.province}-${parsed.title}`)
  );
  const boost = normalizeBoostFields(parsed);

  return prisma.salesProperty.create({
    data: {
      title: parsed.title,
      propertyType: parsed.propertyType,
      listingType: parsed.listingType,
      bedrooms: parsed.bedrooms ?? null,
      bathrooms: parsed.bathrooms ?? null,
      areaSqm: parsed.areaSqm,
      landAreaSqm: parsed.landAreaSqm ?? null,
      floor: parsed.floor ?? null,
      yearBuilt: parsed.yearBuilt ?? null,
      province: parsed.province,
      district: parsed.district ?? null,
      neighborhood: parsed.neighborhood ?? null,
      priceAmount: parsed.priceAmount,
      priceCurrency: parsed.priceCurrency,
      sellerKind: parsed.sellerKind,
      status: parsed.status,
      furnished: parsed.furnished,
      heroMediaType: parsed.heroMediaType,
      heroImageUrl: parsed.heroImageUrl,
      heroVideoUrl: parsed.heroVideoUrl ?? null,
      imageUrls: parsed.imageUrls,
      videoUrls: parsed.videoUrls,
      description: parsed.description,
      specifications: parsed.specifications ?? undefined,
      published: parsed.published,
      ...boost,
      slug,
      createdById: session.user.id,
    },
  });
}

export async function updateSalesPropertyListing(
  id: string,
  input: z.infer<typeof listingSchema>
) {
  const session = await ensureStaffAccess();
  const listing = await prisma.salesProperty.findUnique({
    where: { id },
    select: { createdById: true },
  });
  if (!listing || !canManageListing(session, listing.createdById)) {
    throw new Error("Unauthorized");
  }

  const parsed = listingSchema.parse(input);
  const slug = await ensureUniqueSlug(
    toSlug(`${parsed.propertyType}-${parsed.province}-${parsed.title}`),
    id
  );
  const boost = normalizeBoostFields(parsed);

  return prisma.salesProperty.update({
    where: { id },
    data: {
      title: parsed.title,
      propertyType: parsed.propertyType,
      listingType: parsed.listingType,
      bedrooms: parsed.bedrooms ?? null,
      bathrooms: parsed.bathrooms ?? null,
      areaSqm: parsed.areaSqm,
      landAreaSqm: parsed.landAreaSqm ?? null,
      floor: parsed.floor ?? null,
      yearBuilt: parsed.yearBuilt ?? null,
      province: parsed.province,
      district: parsed.district ?? null,
      neighborhood: parsed.neighborhood ?? null,
      priceAmount: parsed.priceAmount,
      priceCurrency: parsed.priceCurrency,
      sellerKind: parsed.sellerKind,
      status: parsed.status,
      furnished: parsed.furnished,
      heroMediaType: parsed.heroMediaType,
      heroImageUrl: parsed.heroImageUrl,
      heroVideoUrl: parsed.heroVideoUrl ?? null,
      imageUrls: parsed.imageUrls,
      videoUrls: parsed.videoUrls,
      description: parsed.description,
      specifications: parsed.specifications ?? undefined,
      published: parsed.published,
      ...boost,
      slug,
    },
  });
}

export async function deleteSalesPropertyListing(id: string) {
  const session = await ensureStaffAccess();
  const listing = await prisma.salesProperty.findUnique({
    where: { id },
    select: { createdById: true },
  });
  if (!listing || !canManageListing(session, listing.createdById)) {
    throw new Error("Unauthorized");
  }

  return prisma.salesProperty.delete({ where: { id } });
}

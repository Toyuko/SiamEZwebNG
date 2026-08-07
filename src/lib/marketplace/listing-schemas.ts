import { z } from "zod";

/** Absolute http(s) URL or site-root path (e.g. /sales/…/photo.jpg). */
export const listingImageSrcSchema = z
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

function mediaSuperRefine(
  value: {
    imageUrls: string[];
    videoUrls: string[];
    heroMediaType: "image" | "video";
    heroImageUrl: string;
    heroVideoUrl: string | null | undefined;
  },
  ctx: z.RefinementCtx
) {
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
}

export const vehicleListingSchema = z
  .object({
    title: z.string().min(3),
    make: z.string().min(1),
    model: z.string().min(1),
    year: z.number().int().min(1950).max(new Date().getFullYear() + 1),
    mileageKm: z.number().int().min(0),
    priceAmount: z.number().int().min(1),
    priceCurrency: z.string().min(3).max(3).default("THB"),
    category: z.enum(["car", "motorcycle"]),
    sellerKind: z.enum(["dealer", "private"]).default("private"),
    status: z.enum(["available", "reserved", "sold", "pending_boost"]),
    heroMediaType: z.enum(["image", "video"]).default("image"),
    heroImageUrl: listingImageSrcSchema,
    heroVideoUrl: z.string().url().nullable().optional().default(null),
    imageUrls: z.array(listingImageSrcSchema).default([]),
    videoUrls: z.array(z.string().url()).optional().default([]),
    description: z.string().min(20),
    specifications: z.record(z.string(), z.string()).optional(),
    published: z.boolean().default(true),
  })
  .superRefine(mediaSuperRefine);

export type VehicleListingInput = z.infer<typeof vehicleListingSchema>;

export const propertyListingSchema = z
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
    furnished: z
      .enum(["unfurnished", "partially", "furnished", "not_applicable"])
      .default("not_applicable"),
    heroMediaType: z.enum(["image", "video"]).default("image"),
    heroImageUrl: listingImageSrcSchema,
    heroVideoUrl: z.string().url().nullable().optional().default(null),
    imageUrls: z.array(listingImageSrcSchema).default([]),
    videoUrls: z.array(z.string().url()).optional().default([]),
    description: z.string().min(20),
    specifications: z.record(z.string(), z.string()).optional(),
    published: z.boolean().default(true),
    isBoosted: z.boolean().default(false),
    boostExpiresAt: z.coerce.date().nullable().optional(),
  })
  .superRefine(mediaSuperRefine);

export type PropertyListingInput = z.infer<typeof propertyListingSchema>;

export function toListingSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function canManageOwnedListing(
  role: string,
  userId: string,
  createdById: string | null
) {
  if (role === "admin" || role === "staff") return true;
  return createdById === userId;
}

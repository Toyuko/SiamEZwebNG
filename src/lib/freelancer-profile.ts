import { z } from "zod";

/** Public service listing on a freelancer profile. Prices are in satang. */
export type FreelancerServiceOffering = {
  title: string;
  description?: string;
  price?: number | null;
  currency?: string;
};

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const freelancerServiceSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  price: z.number().int().min(0).max(100_000_000).nullable().optional(),
  currency: z.string().trim().max(8).optional(),
});

export const freelancerProfileUpdateSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3, "Slug must be at least 3 characters")
    .max(48, "Slug must be at most 48 characters")
    .regex(SLUG_REGEX, "Use lowercase letters, numbers, and hyphens only"),
  isPublic: z.boolean(),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  bio: z.string().trim().max(4000).optional().or(z.literal("")),
  skills: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  hourlyRate: z.number().int().min(0).max(100_000_000).nullable().optional(),
  services: z.array(freelancerServiceSchema).max(20).default([]),
});

export type FreelancerProfileUpdateInput = z.infer<typeof freelancerProfileUpdateSchema>;

export function parseFreelancerServices(value: unknown): FreelancerServiceOffering[] {
  if (!Array.isArray(value)) return [];
  const out: FreelancerServiceOffering[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title) continue;
    const description =
      typeof row.description === "string" && row.description.trim()
        ? row.description.trim()
        : undefined;
    const price =
      typeof row.price === "number" && Number.isFinite(row.price) ? Math.round(row.price) : null;
    const currency = typeof row.currency === "string" && row.currency.trim() ? row.currency.trim() : "THB";
    out.push({ title, description, price, currency });
  }
  return out;
}

export function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Reserved slugs that must not collide with app routes or system paths. */
export const RESERVED_FREELANCER_SLUGS = new Set([
  "me",
  "new",
  "edit",
  "admin",
  "api",
  "search",
  "browse",
]);

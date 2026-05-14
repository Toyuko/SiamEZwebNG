import { existsSync } from "node:fs";
import { join } from "node:path";

/** Dealer motorcycles from the Sunset Scooters Thailand batch (see prisma/seed.ts). */
export function isSunsetScootersDealerMotorcycleListing(input: {
  category: "car" | "motorcycle";
  sellerKind: "dealer" | "private";
}): boolean {
  return input.sellerKind === "dealer" && input.category === "motorcycle";
}

const SUNSET_HERO_PUBLIC_PREFIX = "/images/sales/sunset-heroes";

function normalizeImageUrlList(imageUrls: unknown): string[] {
  if (!Array.isArray(imageUrls)) return [];
  return imageUrls.filter((u): u is string => typeof u === "string" && u.length > 0);
}

/**
 * VirtualYard gallery URLs are lexicographically sorted in the seed module; index 0 is often
 * the same tile used as storefront cover. Prefer a later frame when no per-slug hero exists.
 */
function pickSunsetMotorcycleHeroFromSortedGallery(urls: string[]): string | null {
  const unique = [...new Set(urls)];
  if (unique.length === 0) return null;
  if (unique.length === 1) return unique[0] ?? null;
  const preferIndex = unique.length >= 4 ? 2 : 1;
  return unique[Math.min(preferIndex, unique.length - 1)] ?? unique[0] ?? null;
}

function findExistingSunsetSlugHeroPublicPath(slug: string): string | null {
  const base = join(process.cwd(), "public", "images", "sales", "sunset-heroes", slug);
  const extensions = [".webp", ".png", ".jpg", ".jpeg"] as const;
  for (const ext of extensions) {
    if (existsSync(`${base}${ext}`)) {
      return `${SUNSET_HERO_PUBLIC_PREFIX}/${slug}${ext}`;
    }
  }
  return null;
}

/**
 * Public hero URL for Sunset Scooters dealer motorcycles: optional per-slug file under
 * `public/images/sales/sunset-heroes/{slug}.{png|jpg|...}`, otherwise a gallery frame that
 * is less likely to match the storefront cover (see pickSunsetMotorcycleHeroFromSortedGallery).
 */
export function resolveSunsetDealerMotorcycleHeroUrl(input: {
  slug: string;
  heroImageUrl: string;
  imageUrls: unknown;
}): string {
  const fromSlug = findExistingSunsetSlugHeroPublicPath(input.slug);
  if (fromSlug) return fromSlug;

  const gallery = normalizeImageUrlList(input.imageUrls);
  const fromGallery = pickSunsetMotorcycleHeroFromSortedGallery(
    gallery.length > 0 ? gallery : [input.heroImageUrl]
  );
  return fromGallery ?? input.heroImageUrl;
}

import type { GoogleTestimonial } from "@/content/google-testimonials";
import type { SocialTestimonial } from "@/content/social-testimonials";

export type TestimonialPlatformFilter = "all" | "google" | "facebook" | "youtube";

export type DisplayTestimonial = {
  id: string;
  platform: Exclude<TestimonialPlatformFilter, "all">;
  service: string;
  quote: string;
  author: string;
  role: string;
  initials: string;
  stars: number;
  videoLink?: string;
};

export function initialsFromDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "??";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0];
    const b = parts[parts.length - 1][0];
    if (a && b) return (a + b).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function socialToDisplay(
  item: SocialTestimonial,
  roleLabel: string
): DisplayTestimonial {
  return {
    id: item.id,
    platform: item.platform,
    service: item.service,
    quote: item.quote,
    author: item.author,
    role: roleLabel,
    initials: initialsFromDisplayName(item.author),
    stars: item.stars,
    ...(item.videoLink ? { videoLink: item.videoLink } : {}),
  };
}

export function googleReviewToDisplay(
  item: GoogleTestimonial,
  roleLabel: string
): DisplayTestimonial {
  return {
    id: item.id,
    platform: "google",
    service: item.service,
    quote: item.quote,
    author: item.author,
    role: roleLabel,
    initials: initialsFromDisplayName(item.author),
    stars: item.stars,
  };
}

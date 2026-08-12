import { site } from "@/config/site";
import { routing } from "@/i18n/routing";

export type AppLocale = (typeof routing.locales)[number];

/** Production origin with no trailing slash. */
export function getSiteOrigin(): string {
  return site.url.replace(/\/$/, "");
}

/** Normalize a path to `/{segment}` or `""` for the homepage. */
export function normalizePath(path: string): string {
  if (!path || path === "/") return "";
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return withSlash.replace(/\/+$/, "");
}

export function localizedPath(locale: string, path = ""): string {
  return `/${locale}${normalizePath(path)}`;
}

/** Canonical absolute URL for a locale + path (no query string). */
export function canonicalUrl(locale: string, path = ""): string {
  return `${getSiteOrigin()}${localizedPath(locale, path)}`;
}

/** hreflang map including `x-default` → English (default locale). */
export function languageAlternates(path = ""): Record<string, string> {
  const origin = getSiteOrigin();
  const normalized = normalizePath(path);
  const languages: Record<string, string> = {
    "x-default": `${origin}/${routing.defaultLocale}${normalized}`,
  };
  for (const locale of routing.locales) {
    languages[locale] = `${origin}/${locale}${normalized}`;
  }
  return languages;
}

export function ogLocale(locale: string): string {
  return locale === "th" ? "th_TH" : "en_US";
}

export function isAppLocale(value: string): value is AppLocale {
  return (routing.locales as readonly string[]).includes(value);
}

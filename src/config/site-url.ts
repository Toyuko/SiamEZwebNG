/**
 * Canonical public origin for SiamEZ.
 *
 * Production: https://siam-ez.com
 * Preview: the current Vercel deployment URL
 * Development: http://localhost:3000
 *
 * Prefer NEXT_PUBLIC_SITE_URL when set. Do not scatter production hosts
 * through the app — import from here instead.
 */

export const PRODUCTION_SITE_HOST = "siam-ez.com";
export const WWW_SITE_HOST = "www.siam-ez.com";
export const PRODUCTION_SITE_ORIGIN = "https://siam-ez.com";
export const LOCAL_SITE_ORIGIN = "http://localhost:3000";

/** Exact Vercel production aliases that should 308 to the custom domain. */
export const LEGACY_VERCEL_PRODUCTION_HOSTS = [
  "siam-e-zweb-ng.vercel.app",
  "siam-e-zweb-ng-toyukos-projects.vercel.app",
] as const;

export type SiteUrlEnv = Record<string, string | undefined>;

function firstDefined(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

export function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function hostnameOf(hostOrUrl: string): string {
  const trimmed = hostOrUrl.trim().toLowerCase();
  if (!trimmed) return "";
  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    return new URL(withProtocol).hostname;
  } catch {
    return trimmed.split("/")[0]?.split(":")[0] ?? "";
  }
}

export function normalizeOrigin(url: string): string {
  const trimmed = url.trim();
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return stripTrailingSlash(withProtocol);
}

/**
 * Public site origin with no trailing slash.
 * Safe to call from server or client (uses NEXT_PUBLIC_ fallbacks).
 */
export function resolvePublicSiteUrl(env: SiteUrlEnv = process.env): string {
  const explicit = firstDefined(env.NEXT_PUBLIC_SITE_URL);
  if (explicit) return normalizeOrigin(explicit);

  const vercelEnv = firstDefined(env.VERCEL_ENV, env.NEXT_PUBLIC_VERCEL_ENV);
  const vercelUrl = firstDefined(env.VERCEL_URL, env.NEXT_PUBLIC_VERCEL_URL);

  if (vercelEnv === "production") {
    return PRODUCTION_SITE_ORIGIN;
  }

  if (vercelUrl && (vercelEnv === "preview" || vercelEnv === "development")) {
    return normalizeOrigin(`https://${hostnameOf(vercelUrl)}`);
  }

  const authUrl = firstDefined(env.AUTH_URL, env.NEXTAUTH_URL);
  if (authUrl && vercelEnv !== "preview") {
    return normalizeOrigin(authUrl);
  }

  if (env.NODE_ENV === "production") {
    return PRODUCTION_SITE_ORIGIN;
  }

  return LOCAL_SITE_ORIGIN;
}

function isInternalPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname === "/api" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/_vercel/")
  );
}

function customProductionDomainIsAttached(env: SiteUrlEnv): boolean {
  const productionHost = hostnameOf(
    firstDefined(env.VERCEL_PROJECT_PRODUCTION_URL, env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) ??
      ""
  );
  return productionHost === PRODUCTION_SITE_HOST || productionHost === WWW_SITE_HOST;
}

/**
 * Path-preserving 308 target when the request host is www or a retired
 * production Vercel alias. Returns null when no redirect should occur.
 *
 * API / webhook / cron paths are never redirected so existing provider
 * endpoints on the Vercel alias keep working until they are updated.
 *
 * Legacy Vercel-host redirects only fire after `siam-ez.com` is attached as
 * the project's production domain — otherwise we would send live traffic to
 * the previous PHP site still hosted on that hostname.
 */
export function getCanonicalHostRedirect(
  hostHeader: string,
  pathname: string,
  search = "",
  env: SiteUrlEnv = process.env
): string | null {
  if (isInternalPath(pathname)) return null;

  const host = hostnameOf(hostHeader);
  if (!host || host === PRODUCTION_SITE_HOST) return null;

  const destination = `${PRODUCTION_SITE_ORIGIN}${pathname}${search}`;

  if (host === WWW_SITE_HOST) {
    return destination;
  }

  if (
    (LEGACY_VERCEL_PRODUCTION_HOSTS as readonly string[]).includes(host) &&
    customProductionDomainIsAttached(env)
  ) {
    return destination;
  }

  return null;
}

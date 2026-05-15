/**
 * Same-origin relative path only (prevents open redirects).
 */
export function resolvePostAuthRedirect(
  locale: string,
  redirect?: string | null,
  role?: string | null
): string {
  const roleFallback =
    role === "freelancer" ? `/${locale}/portal/freelancer` : `/${locale}/portal`;
  const fallback = roleFallback;
  if (!redirect || typeof redirect !== "string") return fallback;
  const trimmed = redirect.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  return trimmed;
}

export function safeRedirectQueryParam(redirect?: string | null): string | undefined {
  if (!redirect || typeof redirect !== "string") return undefined;
  const trimmed = redirect.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return undefined;
  return trimmed;
}

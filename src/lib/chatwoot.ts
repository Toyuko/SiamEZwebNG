/**
 * Chatwoot website widget config (public website token only — never API access tokens).
 */

export type ChatwootPublicConfig = {
  websiteToken: string;
  baseUrl: string;
};

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

/** Chatwoot Cloud default when self-host URL is not set. */
export const CHATWOOT_CLOUD_BASE_URL = "https://app.chatwoot.com";

/**
 * Returns widget config when the website token is set; otherwise null (widget stays off).
 */
export function getChatwootPublicConfig(
  env: NodeJS.ProcessEnv = process.env
): ChatwootPublicConfig | null {
  const websiteToken = firstNonEmpty(env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN);
  if (!websiteToken) return null;

  const baseUrl =
    firstNonEmpty(env.NEXT_PUBLIC_CHATWOOT_BASE_URL)?.replace(/\/$/, "") ??
    CHATWOOT_CLOUD_BASE_URL;

  return { websiteToken, baseUrl };
}

/**
 * Customer-facing routes only — skip admin and staff tools.
 * Path shape: /{locale}/admin/..., /{locale}/staff-calendar/...
 */
export function isChatwootRouteEnabled(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  const section = parts[1];
  return section !== "admin" && section !== "staff-calendar";
}

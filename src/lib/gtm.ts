/**
 * Google Tag Manager — container GTM-T6C7CWGM.
 *
 * Override with NEXT_PUBLIC_GTM_ID.
 * Disable with NEXT_PUBLIC_GTM_DISABLED=true.
 */

export const DEFAULT_GTM_ID = "GTM-T6C7CWGM";

const GTM_ID_RE = /^GTM-[A-Z0-9]+$/i;

export type GtmEnv = Record<string, string | undefined>;

function firstNonEmpty(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? "";
  return trimmed || fallback;
}

function isDisabled(env: GtmEnv): boolean {
  const flag = env.NEXT_PUBLIC_GTM_DISABLED?.trim().toLowerCase();
  return flag === "true" || flag === "1";
}

export function getGtmId(env: GtmEnv = process.env): string | null {
  if (isDisabled(env)) return null;
  const gtmId = firstNonEmpty(env.NEXT_PUBLIC_GTM_ID, DEFAULT_GTM_ID);
  return GTM_ID_RE.test(gtmId) ? gtmId : null;
}

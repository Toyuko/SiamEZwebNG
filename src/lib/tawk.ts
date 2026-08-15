/**
 * tawk.to live chat — Concierge staff handoff (launcher hidden until opened).
 *
 * Direct chat: https://tawk.to/chat/{propertyId}/{widgetId}
 * Embed: https://embed.tawk.to/{propertyId}/{widgetId}
 *
 * Override with NEXT_PUBLIC_TAWK_PROPERTY_ID / NEXT_PUBLIC_TAWK_WIDGET_ID.
 * Disable with NEXT_PUBLIC_TAWK_DISABLED=true.
 */

export const TAWK_OPEN_HREF = "tawk:open";
export const TAWK_OPEN_EVENT = "siamez:tawk:open";
export const TAWK_MAXIMIZED_EVENT = "siamez:tawk:maximized";

/** SiamEZ property / widget from https://tawk.to/chat/695aa4100311b3197dea1777/1je511ot8 */
export const DEFAULT_TAWK_PROPERTY_ID = "695aa4100311b3197dea1777";
export const DEFAULT_TAWK_WIDGET_ID = "1je511ot8";

const ID_RE = /^[a-zA-Z0-9_-]+$/;

export type TawkEnv = Record<string, string | undefined>;

export type TawkConfig = {
  propertyId: string;
  widgetId: string;
};

export type TawkOpenDetail = {
  /** Short conversation summary for the agent (tawk metadata max 255 chars). */
  summary?: string;
};

export type TawkApi = {
  maximize?: () => void;
  minimize?: () => void;
  showWidget?: () => void;
  hideWidget?: () => void;
  addEvent?: (
    name: string,
    meta?: Record<string, string>,
    callback?: (error?: unknown) => void
  ) => void;
  addTags?: (tags: string[], callback?: (error?: unknown) => void) => void;
  onLoad?: () => void;
  onChatMaximized?: () => void;
  onChatMinimized?: () => void;
  visitor?: { name?: string; email?: string };
};

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}

function firstNonEmpty(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? "";
  return trimmed || fallback;
}

function isDisabled(env: TawkEnv): boolean {
  const flag = env.NEXT_PUBLIC_TAWK_DISABLED?.trim().toLowerCase();
  return flag === "true" || flag === "1";
}

export function getTawkConfig(env: TawkEnv = process.env): TawkConfig | null {
  if (isDisabled(env)) return null;
  const propertyId = firstNonEmpty(env.NEXT_PUBLIC_TAWK_PROPERTY_ID, DEFAULT_TAWK_PROPERTY_ID);
  const widgetId = firstNonEmpty(env.NEXT_PUBLIC_TAWK_WIDGET_ID, DEFAULT_TAWK_WIDGET_ID);
  if (!ID_RE.test(propertyId) || !ID_RE.test(widgetId)) return null;
  return { propertyId, widgetId };
}

export function isTawkConfigured(env: TawkEnv = process.env): boolean {
  return getTawkConfig(env) !== null;
}

export function tawkEmbedSrc(config: TawkConfig): string {
  return `https://embed.tawk.to/${config.propertyId}/${config.widgetId}`;
}

export function isTawkOpenHref(href: string): boolean {
  return href === TAWK_OPEN_HREF;
}

export function dispatchOpenTawk(detail?: TawkOpenDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<TawkOpenDetail>(TAWK_OPEN_EVENT, { detail: detail ?? {} })
  );
}

export function dispatchTawkMaximized(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TAWK_MAXIMIZED_EVENT));
}

/** Truncate Concierge history into a tawk.addEvent metadata string. */
export function summarizeConciergeForTawk(
  messages: Array<{ role: string; content: string }>,
  maxChars = 255
): string {
  const lines = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-6)
    .map((m) => {
      const role = m.role === "user" ? "Customer" : "Ask SiamEZ";
      return `${role}: ${m.content.replace(/\s+/g, " ").trim()}`;
    });
  const joined = lines.join(" | ").trim();
  if (!joined) return "Customer asked to chat with SiamEZ staff from Ask SiamEZ.";
  return joined.length <= maxChars ? joined : `${joined.slice(0, maxChars - 1)}…`;
}

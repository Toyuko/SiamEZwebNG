/**
 * Lightweight analytics helper for service directory events.
 * Pushes to window.dataLayer when present (GTM) and logs in development.
 * Extend with your analytics provider (GA4, PostHog, etc.) in one place.
 */

export type AnalyticsEventName =
  | "service_search"
  | "service_filter_click"
  | "service_card_view"
  | "service_book_click"
  | "service_line_click"
  | "service_details_click";

export type AnalyticsEventPayload = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackEvent(name: AnalyticsEventName, payload?: AnalyticsEventPayload): void {
  if (typeof window === "undefined") return;

  const event = { event: name, ...payload };

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(event);
  }

  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", event);
  }
}

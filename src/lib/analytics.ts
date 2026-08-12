/**
 * Marketing analytics helper.
 * Pushes to window.dataLayer (GTM / gtag) and logs in development.
 * Configure GTM or GA4 via NEXT_PUBLIC_GTM_ID / NEXT_PUBLIC_GA_MEASUREMENT_ID.
 * Do not fire the same conversion twice from two call sites.
 */

export type AnalyticsEventName =
  | "service_search"
  | "service_filter_click"
  | "service_card_view"
  | "service_book_click"
  | "service_line_click"
  | "service_details_click"
  | "service_viewed"
  | "booking_started"
  | "booking_completed"
  | "quote_requested"
  | "contact_submitted"
  | "phone_clicked"
  | "email_clicked"
  | "line_clicked"
  | "whatsapp_clicked"
  | "ai_concierge_started"
  | "ai_concierge_lead"
  | "payment_completed"
  | "listing_enquiry_submitted";

export type AnalyticsEventPayload = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: AnalyticsEventName, payload?: AnalyticsEventPayload): void {
  if (typeof window === "undefined") return;

  const event = { event: name, ...payload };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(event);

  if (typeof window.gtag === "function") {
    window.gtag("event", name, payload ?? {});
  }

  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", event);
  }
}

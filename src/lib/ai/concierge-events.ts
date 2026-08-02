/** Custom DOM event to open the Concierge shell from anywhere on the page. */

export const CONCIERGE_OPEN_EVENT = "siamez:concierge:open";

export type ConciergeOpenDetail = {
  /** Optional first message sent after the panel opens. */
  prompt?: string;
};

export function dispatchOpenConcierge(prompt?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ConciergeOpenDetail>(CONCIERGE_OPEN_EVENT, {
      detail: prompt?.trim() ? { prompt: prompt.trim() } : {},
    })
  );
}

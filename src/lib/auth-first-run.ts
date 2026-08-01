/**
 * First-run onboarding helpers (A04).
 * A08 owns ongoing portal profile — this only detects incomplete first-run state.
 */

export const FIRST_RUN_WELCOME_STORAGE_KEY = "siamez.firstRun.welcomeSeen";

export type FirstRunUserSnapshot = {
  role: string;
  name?: string | null;
  phone?: string | null;
  preferredLocale?: string | null;
  createdAt?: Date | string | null;
};

/** Customers without a phone still need progressive profile completion. */
export function needsFirstRunProfile(user: FirstRunUserSnapshot): boolean {
  if (user.role !== "customer") return false;
  return !user.phone?.trim();
}

/** New customers (created within 48h) may see the welcome experience once. */
export function isRecentCustomer(user: FirstRunUserSnapshot, now = Date.now()): boolean {
  if (user.role !== "customer" || !user.createdAt) return false;
  const created = new Date(user.createdAt).getTime();
  if (Number.isNaN(created)) return false;
  const fortyEightHoursMs = 48 * 60 * 60 * 1000;
  return now - created < fortyEightHoursMs;
}

/** Append welcome flag for post-register customer landings (same-origin relative only). */
export function withWelcomeQuery(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const [base, hash] = path.split("#");
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}welcome=1${hash ? `#${hash}` : ""}`;
}

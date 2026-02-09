import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format amount in smallest currency unit to display string (e.g. 10000 -> "100.00 THB") */
export function formatCurrency(amount: number, currency: string = "THB"): string {
  const value = amount / 100; // assume 2 decimal places
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

/** Generate a unique-ish case number (e.g. SE-2026-a1b2c3). For production, use DB sequence or atomic counter. */
export function nextCaseNumber(prefix: string = "SE", year?: number): string {
  const y = year ?? new Date().getFullYear();
  const t = Date.now().toString(36).slice(-6).toUpperCase();
  const r = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `${prefix}-${y}-${t}${r}`;
}

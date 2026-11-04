import type { BackofficeRole } from "@/lib/backoffice/types";

export function canUseBackoffice(role: string | null | undefined): boolean {
  return role === "admin" || role === "staff";
}

export function canEditPriceCatalogue(role: BackofficeRole): boolean {
  return role === "admin";
}

export function canEditKnowledge(role: BackofficeRole): boolean {
  return role === "admin" || role === "staff";
}

export function canDeleteKnowledge(role: BackofficeRole): boolean {
  return role === "admin";
}

/** Profit, margin, and operating cost stay with administrators. */
export function canViewManagementFinancials(role: BackofficeRole): boolean {
  return role === "admin";
}

export function canConfigureAutomations(role: BackofficeRole): boolean {
  return role === "admin";
}

/** Model-picked writes are dropped when the staff text tried to override safeguards. */
export function shouldBlockUntrustedWrite(flags: string[], source: "staff" | "model"): boolean {
  return source === "model" && flags.length > 0;
}

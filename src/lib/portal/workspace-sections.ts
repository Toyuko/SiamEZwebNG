/**
 * Wave M6 — which portal home sections render for which role.
 * Pure helpers (no I/O) so unit tests can lock the customer shell contract.
 */

export type PortalHomeRole = string;

/** Sections that make up the unified customer workspace shell. */
export type CustomerWorkspaceSectionId =
  | "goals"
  | "bookings"
  | "saved"
  | "documents"
  | "invoices"
  | "recommendations"
  | "seller";

export type PortalHomeRedirect = "company" | "freelancer";

/** Preserve existing freelancer/company portal entry redirects. */
export function portalHomeRedirectForRole(
  role: PortalHomeRole
): PortalHomeRedirect | null {
  if (role === "company") return "company";
  if (role === "freelancer") return "freelancer";
  return null;
}

/**
 * Customer (and other non-redirect roles) get the unified workspace.
 * Seller analytics is additive and only when the user owns listings.
 */
export function resolveCustomerWorkspaceSections(input: {
  listingCount: number;
}): CustomerWorkspaceSectionId[] {
  const sections: CustomerWorkspaceSectionId[] = [
    "goals",
    "bookings",
    "saved",
    "documents",
    "invoices",
    "recommendations",
  ];
  if (input.listingCount > 0) {
    sections.push("seller");
  }
  return sections;
}

export function shouldShowSellerAnalytics(listingCount: number): boolean {
  return listingCount > 0;
}

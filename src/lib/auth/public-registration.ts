/**
 * Public self-serve signup may create customer, freelancer, or company accounts.
 * Privileged roles (admin / staff) are never accepted from the client.
 */
export const PUBLIC_REGISTRATION_ROLES = [
  "customer",
  "freelancer",
  "company",
] as const;

export type PublicRegistrationRole = (typeof PUBLIC_REGISTRATION_ROLES)[number];

export const PUBLIC_REGISTRATION_ROLE = "customer" as const satisfies PublicRegistrationRole;

/**
 * Maps client accountType to a safe public role.
 * Accepts `corporate` as an alias for `company` (mobile signup).
 * Anything else (including admin/staff) falls back to customer.
 */
export function resolvePublicRegistrationRole(
  requested?: string | null
): PublicRegistrationRole {
  const normalized = (requested ?? "").trim().toLowerCase();
  if (normalized === "freelancer") return "freelancer";
  if (normalized === "company" || normalized === "corporate") return "company";
  return PUBLIC_REGISTRATION_ROLE;
}

export function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim();
  return local && local.length > 0 ? local : "Customer";
}

import type { UserRole } from "@prisma/client";

/** Admin or staff (internal operators). */
export function isStaffRole(role: string | UserRole | null | undefined): boolean {
  return role === "admin" || role === "staff";
}

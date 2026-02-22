/**
 * Auth helpers for SiamEZ.
 * Uses Auth.js (NextAuth v5) with database sessions.
 */

import type { UserRole } from "@prisma/client";
import { auth } from "@/auth";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  image?: string | null;
}

export interface Session {
  user: SessionUser;
  expires: string;
}

/** Get current session (null if not authenticated). */
export async function getSession(): Promise<Session | null> {
  const s = await auth();
  if (!s?.user?.id) return null;
  const role = (s.user as { role?: UserRole }).role ?? "customer";
  return {
    user: {
      id: s.user.id,
      email: s.user.email ?? "",
      name: s.user.name ?? null,
      role,
      image: (s.user as { image?: string | null }).image ?? s.user.image ?? null,
    },
    expires: s.expires ?? "",
  };
}

/** Get current user (convenience alias). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session?.user ?? null;
}

/** Throws if not authenticated. Use in Server Components and Server Actions. */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

/** Returns a predicate to check if session has one of the given roles. */
export function requireRole(role: UserRole | UserRole[]): (session: Session) => boolean {
  const allowed = Array.isArray(role) ? role : [role];
  return (session) => allowed.includes(session.user.role);
}

/**
 * Auth configuration placeholder.
 * Replace with NextAuth.js or custom session (e.g. encrypted cookie + DB).
 * For now we only define types and a getSession stub for layout/middleware.
 */

import type { UserRole } from "@prisma/client";

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

export async function getSession(): Promise<Session | null> {
  // TODO: implement NextAuth getServerSession or custom session read
  return null;
}

export function requireAuth(): Promise<Session> {
  return getSession().then((s) => {
    if (!s) throw new Error("Unauthorized");
    return s;
  });
}

export function requireRole(role: UserRole | UserRole[]): (session: Session) => boolean {
  const allowed = Array.isArray(role) ? role : [role];
  return (session) => allowed.includes(session.user.role);
}

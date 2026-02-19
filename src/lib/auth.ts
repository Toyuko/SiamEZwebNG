/**
 * Auth helpers for SiamEZ.
 * Uses iron-session for encrypted cookie-based sessions.
 */

import type { UserRole } from "@prisma/client";
import { getSession as getSessionData, type SessionData } from "./session";

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
  const data = await getSessionData();
  if (!data) return null;
  return {
    user: {
      id: data.userId,
      email: data.email,
      name: data.name,
      role: data.role,
      image: data.image,
    },
    expires: "", // iron-session handles expiry via cookie maxAge
  };
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

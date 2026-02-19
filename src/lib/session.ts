/**
 * Iron-session configuration for SiamEZ auth.
 * Uses encrypted cookies - no DB hit for session validation.
 */

import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import type { UserRole } from "@prisma/client";

const SESSION_COOKIE = "siamez_session";
// iron-session requires 32+ chars; use NEXTAUTH_SECRET in production
const SESSION_PASSWORD =
  process.env.NEXTAUTH_SECRET ||
  "development-secret-min-32-chars-for-session-encryption";

export interface SessionData {
  userId: string;
  email: string;
  name: string | null;
  role: UserRole;
  image?: string | null;
}

export const sessionOptions = {
  password: SESSION_PASSWORD,
  cookieName: SESSION_COOKIE,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: "lax" as const,
    path: "/",
  },
};

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.userId) return null;
  return session;
}

export async function setSession(data: SessionData): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.userId = data.userId;
  session.email = data.email;
  session.name = data.name;
  session.role = data.role;
  session.image = data.image;
  await session.save();
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.destroy();
}

import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import {
  MARKETPLACE_ANON_COOKIE,
  MARKETPLACE_ANON_COOKIE_MAX_AGE_SEC,
} from "./constants";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MARKETPLACE_ANON_COOKIE_MAX_AGE_SEC,
  };
}

function newAnonymousSessionId(): string {
  // cuid-like opaque id; not used as a public listing URL
  return `mp_${randomBytes(16).toString("hex")}`;
}

/** Read anonymous marketplace session id (does not create). */
export async function readAnonymousSessionId(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(MARKETPLACE_ANON_COOKIE)?.value?.trim();
  return value || null;
}

/**
 * Ensure an anonymous marketplace session cookie exists.
 * Must run in a Server Action / Route Handler (cookie write).
 */
export async function ensureAnonymousSessionId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(MARKETPLACE_ANON_COOKIE)?.value?.trim();
  if (existing) return existing;

  const id = newAnonymousSessionId();
  jar.set(MARKETPLACE_ANON_COOKIE, id, cookieOptions());
  return id;
}

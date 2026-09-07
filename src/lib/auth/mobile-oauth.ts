import { createHmac, randomBytes, timingSafeEqual } from "crypto";

import { createApiJwtForUser } from "@/lib/auth/api-jwt";

const MOBILE_OAUTH_PURPOSE = "mobile_oauth_code";
/** Short-lived authorization code for app ↔ website OAuth handoff. */
const CODE_TTL_SEC = 120;

type MobileOAuthCodePayload = {
  purpose: typeof MOBILE_OAUTH_PURPOSE;
  sub: string;
  email: string;
  role: string;
  name: string | null;
  jti: string;
  iat: number;
  exp: number;
};

function getJwtSecret() {
  const secret = process.env.API_JWT_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("Missing API_JWT_SECRET");
  }
  return secret;
}

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

/**
 * Allowed mobile redirect URIs for OAuth return.
 * Production scheme is `siamez://`; Expo Go / AuthSession may use exp:// or https.
 */
export function isAllowedMobileRedirectUri(redirectUri: string): boolean {
  const trimmed = redirectUri.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "siamez:") return true;
    if (url.protocol === "exp:") return true;
    if (url.protocol === "exps:") return true;
    if (url.protocol === "http:" || url.protocol === "https:") {
      const host = url.hostname.toLowerCase();
      return (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.endsWith(".exp.direct") ||
        host.endsWith(".expo.dev")
      );
    }
    return false;
  } catch {
    return false;
  }
}

export function createMobileOAuthCode(user: {
  id: string;
  email: string;
  role: string;
  name?: string | null;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: MobileOAuthCodePayload = {
    purpose: MOBILE_OAUTH_PURPOSE,
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name ?? null,
    jti: randomBytes(16).toString("hex"),
    iat: now,
    exp: now + CODE_TTL_SEC,
  };

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", getJwtSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function exchangeMobileOAuthCode(code: string) {
  const parts = code.trim().split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid authorization code");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const expectedSignature = createHmac("sha256", getJwtSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  const left = Buffer.from(encodedSignature);
  const right = Buffer.from(expectedSignature);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error("Invalid authorization code");
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as MobileOAuthCodePayload;
  if (
    payload.purpose !== MOBILE_OAUTH_PURPOSE ||
    !payload.sub ||
    !payload.email ||
    !payload.role ||
    !payload.exp
  ) {
    throw new Error("Invalid authorization code");
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Authorization code expired");
  }

  const token = await createApiJwtForUser({
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  });

  return {
    token,
    user: {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    },
  };
}

export const MOBILE_OAUTH_PROVIDERS = ["google", "facebook", "line"] as const;
export type MobileOAuthProvider = (typeof MOBILE_OAUTH_PROVIDERS)[number];

export function isMobileOAuthProvider(value: string): value is MobileOAuthProvider {
  return (MOBILE_OAUTH_PROVIDERS as readonly string[]).includes(value);
}

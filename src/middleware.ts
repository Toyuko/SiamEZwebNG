import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

// Auth.js (NextAuth v5) session cookie names
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];
const LOCALES = routing.locales;

/** Matches /:locale/book/* or /:locale/checkout/* (booking gate) */
function isBookingRoute(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return false;
  const [locale, segment] = parts;
  return LOCALES.includes(locale as "en" | "th") && (segment === "book" || segment === "checkout");
}

/** Matches /:locale/portal/* (client portal) */
function isPortalRoute(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  return parts.length >= 2 && LOCALES.includes(parts[0] as "en" | "th") && parts[1] === "portal";
}

/** Matches /:locale/admin/* (admin area) */
function isAdminRoute(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  return parts.length >= 2 && LOCALES.includes(parts[0] as "en" | "th") && parts[1] === "admin";
}

const intlMiddleware = createMiddleware(routing);
const PROTECTED_API_PREFIXES = ["/api/cases", "/api/invoices", "/api/documents", "/api/payments"];

function b64UrlToBytes(input: string) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

async function verifyApiJwtInMiddleware(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token");
  }
  const [header, payload, signature] = parts;
  const secret = process.env.API_JWT_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("Unauthorized");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    b64UrlToBytes(signature),
    new TextEncoder().encode(`${header}.${payload}`)
  );
  if (!valid) {
    throw new Error("Invalid signature");
  }

  const payloadData = JSON.parse(new TextDecoder().decode(b64UrlToBytes(payload))) as {
    sub?: string;
    exp?: number;
  };
  if (!payloadData.sub || !payloadData.exp || payloadData.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Invalid token payload");
  }
  return payloadData.sub;
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));

  if (PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
      const userId = await verifyApiJwtInMiddleware(authHeader.slice("Bearer ".length).trim());
      const headers = new Headers(request.headers);
      headers.set("x-api-user-id", userId);
      return NextResponse.next({ request: { headers } });
    } catch {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  // Keep non-protected API routes out of locale middleware.
  // Without this, next-intl can rewrite `/api/*` into `/:locale/api/*`,
  // which breaks endpoints like `/api/auth/login` for mobile clients.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Booking gate: /book/* – allow guests; /checkout/* – allow guests with valid token (verified in page)
  // Only portal requires auth for booking-related routes

  // Portal gate: /portal/* – require auth (layout also validates)
  if (isPortalRoute(pathname) && !hasSession) {
    const locale = pathname.split("/")[1] ?? "en";
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin gate: /admin/* – require auth (role check in layout)
  // Bypass: set BYPASS_ADMIN_AUTH=true to skip login for admin
  if (
    process.env.BYPASS_ADMIN_AUTH !== "true" &&
    isAdminRoute(pathname) &&
    !hasSession
  ) {
    const locale = pathname.split("/")[1] ?? "en";
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/api/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};

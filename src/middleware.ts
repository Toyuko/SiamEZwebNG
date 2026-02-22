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

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));

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
    !process.env.BYPASS_ADMIN_AUTH &&
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
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};

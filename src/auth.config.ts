/**
 * Auth.js base configuration (used by middleware).
 * Minimal config for edge-compatible auth checks.
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/en/login", // Locale-aware; next-intl handles /en|th/login
  },
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname.includes("/login") || nextUrl.pathname.includes("/register");
      if (isAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL("/portal", nextUrl));
        return true;
      }
      // Protected routes checked in layouts (portal, admin)
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;

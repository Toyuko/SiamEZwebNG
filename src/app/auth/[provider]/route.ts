import { NextRequest, NextResponse } from "next/server";

import { signIn } from "@/auth";
import {
  isAllowedMobileRedirectUri,
  isMobileOAuthProvider,
} from "@/lib/auth/mobile-oauth";
import { getConfiguredSocialProviders } from "@/lib/auth-providers";

/**
 * Mobile OAuth entry — opened by the Expo app:
 *   GET /auth/{google|facebook|line}?redirect_uri=siamez://…
 *
 * Starts Auth.js OAuth, then returns to `/auth/mobile/complete` which issues
 * a short-lived code for `POST /api/auth/oauth/exchange`.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider: rawProvider } = await context.params;
  const provider = rawProvider.toLowerCase();
  const redirectUri = request.nextUrl.searchParams.get("redirect_uri")?.trim() ?? "";

  if (!isMobileOAuthProvider(provider)) {
    return NextResponse.json({ success: false, error: "Unknown provider" }, { status: 404 });
  }

  if (!isAllowedMobileRedirectUri(redirectUri)) {
    return NextResponse.json(
      { success: false, error: "Invalid redirect_uri" },
      { status: 400 }
    );
  }

  const configured = getConfiguredSocialProviders();
  if (!configured[provider]) {
    return NextResponse.json(
      { success: false, error: `${provider} sign-in is not configured` },
      { status: 503 }
    );
  }

  const completeUrl = new URL("/auth/mobile/complete", request.nextUrl.origin);
  completeUrl.searchParams.set("redirect_uri", redirectUri);

  return signIn(provider, {
    redirectTo: `${completeUrl.pathname}${completeUrl.search}`,
  });
}

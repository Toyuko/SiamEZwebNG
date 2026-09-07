import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  createMobileOAuthCode,
  isAllowedMobileRedirectUri,
} from "@/lib/auth/mobile-oauth";
import { prisma } from "@/lib/db";

/**
 * After Auth.js OAuth succeeds, mint a short-lived code and bounce back to the
 * mobile `redirect_uri` (e.g. `siamez://?code=…`). Never put the long-lived API
 * JWT in the query string.
 */
export async function GET(request: NextRequest) {
  const redirectUri = request.nextUrl.searchParams.get("redirect_uri")?.trim() ?? "";
  if (!isAllowedMobileRedirectUri(redirectUri)) {
    return NextResponse.json(
      { success: false, error: "Invalid redirect_uri" },
      { status: 400 }
    );
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    const loginUrl = new URL("/en/login", request.nextUrl.origin);
    loginUrl.searchParams.set("error", "oauth");
    return NextResponse.redirect(loginUrl);
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, active: true },
  });

  if (!dbUser?.email || !dbUser.active) {
    const loginUrl = new URL("/en/login", request.nextUrl.origin);
    loginUrl.searchParams.set("error", "oauth");
    return NextResponse.redirect(loginUrl);
  }

  const code = createMobileOAuthCode({
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
    name: dbUser.name,
  });

  const target = new URL(redirectUri);
  target.searchParams.set("code", code);
  return NextResponse.redirect(target.toString());
}

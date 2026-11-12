import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";
import { isStaffRole } from "@/lib/auth/roles";
import { accessTokensMatch } from "@/lib/licence-verification/access";
import { readLicenceFile } from "@/lib/licence-verification/storage";
import { checkRateLimit, clientKeyFromRequest, rateLimitResponse } from "@/lib/security/rate-limit";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const COOKIE = "siamez_licence_access";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const limit = checkRateLimit(clientKeyFromRequest(request, "licence-doc"), 120, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec);
  const { id } = await context.params;
  const document = await prisma.licenceDocument.findUnique({
    where: { id },
    include: { application: { select: { accessToken: true, userId: true } } },
  });
  if (!document) return new NextResponse("Not found", { status: 404 });

  const session = await getSession();
  const staff = isAdminAuthBypassEnabled() || (session?.user.role ? isStaffRole(session.user.role) : false);
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  const decoded = token ? decodeURIComponent(token) : "";
  const owner = Boolean(session?.user.id && document.application.userId && session.user.id === document.application.userId);
  const guest = decoded ? accessTokensMatch(document.application.accessToken, decoded) : false;
  if (!staff && !owner && !guest) return new NextResponse("Not found", { status: 404 });

  const bytes = await readLicenceFile(document.storageKey);
  if (!bytes) return new NextResponse("File is not available", { status: 404 });
  const name = document.originalName.replace(/[^\w.\- ]/g, "_");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

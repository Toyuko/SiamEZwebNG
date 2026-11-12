import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";
import { isStaffRole } from "@/lib/auth/roles";
import { openDltDownload } from "@/lib/dlt-package/service";
import { checkRateLimit, clientKeyFromRequest, rateLimitResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const limit = checkRateLimit(clientKeyFromRequest(request, "dlt-package"), 60, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec);
  const session = await getSession();
  const staff = isAdminAuthBypassEnabled() || (session?.user.role ? isStaffRole(session.user.role) : false);
  if (!staff) return new NextResponse("Not found", { status: 404 });

  const { id } = await context.params;
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  if (kind !== "complete" && kind !== "cover" && kind !== "individual") {
    return NextResponse.json({ ok: false, error: "Choose a download type." }, { status: 400 });
  }
  const file = await openDltDownload({
    packageId: id,
    kind,
    documentId: url.searchParams.get("documentId") ?? undefined,
    staffId: session?.user.id ?? null,
  });
  if (!file) return new NextResponse("Not found", { status: 404 });
  const name = file.fileName.replace(/[^\w.\- ]/g, "_");
  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

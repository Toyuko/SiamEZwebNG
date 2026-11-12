import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { UploadLinkError, uploadForRequestToken } from "@/lib/licence-verification/upload-request";
import { checkRateLimit, clientKeyFromRequest, rateLimitResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = checkRateLimit(clientKeyFromRequest(request, "licence-upload-link"), 40, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec);
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  const documentType = String(form.get("documentType") ?? "");
  const replaces = String(form.get("replacesDocumentId") ?? "");
  const file = form.get("file");
  if (!token || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Choose a file and open your link again." }, { status: 400 });
  }
  const session = await getSession();
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const document = await uploadForRequestToken({
      token,
      viewer: session ? { id: session.user.id, role: session.user.role } : null,
      documentType,
      fileName: file.name || "document",
      bytes,
      declaredType: file.type,
      replacesDocumentId: replaces || null,
    });
    return NextResponse.json({ ok: true, document });
  } catch (error) {
    if (error instanceof UploadLinkError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Upload failed.";
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

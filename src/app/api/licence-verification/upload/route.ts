import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { accessTokensMatch } from "@/lib/licence-verification/access";
import { uploadLicenceDocument } from "@/lib/licence-verification/service";
import { checkRateLimit, clientKeyFromRequest, rateLimitResponse } from "@/lib/security/rate-limit";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = checkRateLimit(clientKeyFromRequest(request, "licence-upload"), 40, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec);
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  const documentType = String(form.get("documentType") ?? "");
  const replaces = String(form.get("replacesDocumentId") ?? "");
  const file = form.get("file");
  if (!token || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Choose a file and open your application again." }, { status: 400 });
  }
  const application = await prisma.licenceApplication.findUnique({
    where: { accessToken: token },
    select: { accessToken: true, userId: true },
  });
  if (!application || !accessTokensMatch(application.accessToken, token)) {
    return NextResponse.json({ ok: false, error: "Application not found." }, { status: 404 });
  }
  const session = await getSession();
  if (application.userId && session?.user.role === "customer" && session.user.id !== application.userId) {
    return NextResponse.json({ ok: false, error: "You cannot upload to this application." }, { status: 403 });
  }
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const document = await uploadLicenceDocument({
      token,
      documentType,
      fileName: file.name || "document",
      bytes,
      declaredType: file.type,
      replacesDocumentId: replaces || null,
      userId: session?.user.id ?? null,
    });
    return NextResponse.json({ ok: true, document });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 }
    );
  }
}

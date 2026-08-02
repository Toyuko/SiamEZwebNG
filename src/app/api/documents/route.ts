import { NextRequest, NextResponse } from "next/server";
import { createDocument, getDocumentsByUserId } from "@/data-access/document";
import { prisma } from "@/lib/db";
import { requireBearerApiUser } from "@/lib/auth/requireBearerApiUser";

/**
 * GET /api/documents
 * List documents for the authenticated mobile/API user.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireBearerApiUser(request);
    const docs = await getDocumentsByUserId(userId);
    const mapped = docs.map((doc) => ({
      id: doc.id,
      name: doc.name,
      type: doc.documentType ?? doc.mimeType ?? "document",
      uploadedAt: doc.createdAt.toISOString(),
      status: "PENDING" as const,
    }));
    return NextResponse.json({ success: true, data: mapped });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    console.error("GET /api/documents error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list documents" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents
 * Upload document metadata (file must be uploaded to storage separately).
 * Body: { caseId?, name, storageKey, uploadedBy?, mimeType?, size?, documentType? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, name, storageKey, uploadedBy, mimeType, size, documentType } = body;

    if (!name || !storageKey) {
      return NextResponse.json(
        { error: "name and storageKey required" },
        { status: 400 }
      );
    }

    const resolvedCaseId =
      typeof caseId === "string" && caseId.trim() !== "" ? caseId.trim() : null;
    if (resolvedCaseId) {
      const caseRecord = await prisma.case.findUnique({
        where: { id: resolvedCaseId },
        select: { id: true },
      });
      if (!caseRecord) {
        return NextResponse.json({ error: "Case not found" }, { status: 404 });
      }
    }

    const doc = await createDocument({
      caseId: resolvedCaseId,
      name,
      storageKey,
      uploadedBy: uploadedBy ?? undefined,
      mimeType: mimeType ?? undefined,
      size: size != null ? Number(size) : undefined,
      documentType: documentType ?? undefined,
    });

    return NextResponse.json({ success: true, documentId: doc.id });
  } catch (e) {
    console.error("POST /api/documents error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save document metadata" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createDocument } from "@/data-access/document";
import { prisma } from "@/lib/db";

/**
 * POST /api/documents
 * Upload document metadata (file must be uploaded to storage separately).
 * Body: { caseId, name, storageKey, uploadedBy?, mimeType?, size?, documentType? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, name, storageKey, uploadedBy, mimeType, size, documentType } = body;

    if (!caseId || !name || !storageKey) {
      return NextResponse.json(
        { error: "caseId, name, and storageKey required" },
        { status: 400 }
      );
    }

    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true },
    });
    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const doc = await createDocument({
      caseId,
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

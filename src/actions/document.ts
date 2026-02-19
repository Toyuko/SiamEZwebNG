"use server";

import { createDocument } from "@/data-access/document";
import { prisma } from "@/lib/db";

export interface UploadDocumentMetadataInput {
  caseId: string;
  name: string;
  storageKey: string;
  uploadedBy?: string;
  mimeType?: string;
  size?: number;
  documentType?: string;
}

export interface UploadDocumentMetadataResult {
  success: boolean;
  documentId?: string;
  error?: string;
}

/**
 * Creates a document record (metadata only). The actual file must be uploaded to
 * storage (e.g. Vercel Blob, S3) separately; pass the storage key here.
 */
export async function uploadDocumentMetadataAction(
  input: UploadDocumentMetadataInput
): Promise<UploadDocumentMetadataResult> {
  try {
    const caseRecord = await prisma.case.findUnique({
      where: { id: input.caseId },
      select: { id: true },
    });
    if (!caseRecord) {
      return { success: false, error: "Case not found" };
    }

    const doc = await createDocument({
      caseId: input.caseId,
      name: input.name,
      storageKey: input.storageKey,
      uploadedBy: input.uploadedBy,
      mimeType: input.mimeType,
      size: input.size,
      documentType: input.documentType,
    });

    return { success: true, documentId: doc.id };
  } catch (e) {
    console.error("uploadDocumentMetadata error", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save document metadata",
    };
  }
}

"use server";

import { put } from "@vercel/blob";
import { createDocument } from "@/data-access/document";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // match next.config serverActions.bodySizeLimit

function safeFileSegment(name: string) {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
  return base || "file";
}

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

export interface AdminUploadDocumentResult {
  success: boolean;
  documentId?: string;
  error?: string;
}

/**
 * Staff/admin only: upload file to Vercel Blob and create a Document row.
 * Expects FormData: caseId (optional string), file (File), documentType (optional string).
 */
export async function adminUploadDocumentAction(
  formData: FormData
): Promise<AdminUploadDocumentResult> {
  const bypass = process.env.BYPASS_ADMIN_AUTH === "true";
  let uploadedBy: string | undefined;

  if (!bypass) {
    const session = await getSession();
    if (!session || (session.user.role !== "admin" && session.user.role !== "staff")) {
      return { success: false, error: "Unauthorized" };
    }
    uploadedBy = session.user.id;
  }

  const caseIdRaw = (formData.get("caseId") as string | null)?.trim();
  const caseId = caseIdRaw && caseIdRaw.length > 0 ? caseIdRaw : null;
  const documentTypeRaw = (formData.get("documentType") as string | null)?.trim();
  const documentType = documentTypeRaw || undefined;
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return { success: false, error: "Choose a file to upload." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { success: false, error: "File is too large (max 10 MB)." };
  }

  if (caseId) {
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true },
    });
    if (!caseRecord) {
      return { success: false, error: "Case not found." };
    }
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      success: false,
      error: "File storage is not configured (set BLOB_READ_WRITE_TOKEN).",
    };
  }

  try {
    const storageFolder = caseId ?? "unassigned";
    const pathname = `documents/${storageFolder}/${Date.now()}-${safeFileSegment(file.name)}`;
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
    });

    const doc = await createDocument({
      caseId: caseId ?? null,
      name: file.name,
      storageKey: blob.url,
      uploadedBy,
      mimeType: file.type || undefined,
      size: file.size,
      documentType,
    });

    return { success: true, documentId: doc.id };
  } catch (e) {
    console.error("adminUploadDocumentAction", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Upload failed",
    };
  }
}

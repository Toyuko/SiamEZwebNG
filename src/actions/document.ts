"use server";

import { getSession, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createDocumentMetadata as createDocumentMetadataDomain,
  uploadAndCreateDocument,
} from "@/lib/domain/documents";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // match next.config serverActions.bodySizeLimit

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

async function assertCanAttachDocumentToCase(caseId: string, userId: string, role: string) {
  if (role === "admin" || role === "staff") return;
  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    select: { userId: true },
  });
  if (!caseRecord) {
    throw new Error("Case not found");
  }
  if (caseRecord.userId !== userId) {
    throw new Error("Forbidden");
  }
}

/**
 * Creates a document record (metadata only). The actual file must be uploaded to
 * storage (e.g. Vercel Blob, S3) separately; pass the storage key here.
 * Requires auth; callers may only attach to cases they own (or staff/admin).
 */
export async function uploadDocumentMetadataAction(
  input: UploadDocumentMetadataInput
): Promise<UploadDocumentMetadataResult> {
  try {
    const session = await requireAuth();
    await assertCanAttachDocumentToCase(input.caseId, session.user.id, session.user.role);

    const doc = await createDocumentMetadataDomain({
      caseId: input.caseId,
      name: input.name,
      storageKey: input.storageKey,
      uploadedBy: session.user.id,
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

  try {
    const doc = await uploadAndCreateDocument({
      file,
      caseId: caseId ?? null,
      uploadedBy,
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

export interface UploadUserSalesBoostProofResult {
  success: boolean;
  documentId?: string;
  error?: string;
}

export interface UploadWizardDocumentResult {
  success: boolean;
  documentId?: string;
  storageKey?: string;
  name?: string;
  mimeType?: string;
  size?: number;
  documentType?: string;
  error?: string;
  /** True when Blob token missing and mock:// storage was used. */
  usedMockStorage?: boolean;
}

/**
 * Logged-in user: upload bank slip for a sales listing boost (no case required).
 * Expects FormData: `file` (File).
 */
export async function uploadUserSalesBoostProofAction(
  formData: FormData
): Promise<UploadUserSalesBoostProofResult> {
  const session = await requireAuth();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Choose a file to upload." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { success: false, error: "File is too large (max 10 MB)." };
  }
  try {
    const doc = await uploadAndCreateDocument({
      file,
      caseId: null,
      uploadedBy: session.user.id,
      documentType: "sales_boost_bank_slip",
    });
    return { success: true, documentId: doc.id };
  } catch (e) {
    console.error("uploadUserSalesBoostProofAction", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Upload failed",
    };
  }
}

/**
 * Authenticated booking wizard upload (pre-case). Reuses Vercel Blob helpers;
 * falls back to mock:// storage keys when BLOB_READ_WRITE_TOKEN is unset.
 * Expects FormData: `file` (File), optional `documentType`.
 */
export async function uploadWizardDocumentAction(
  formData: FormData
): Promise<UploadWizardDocumentResult> {
  try {
    const session = await requireAuth();
    const file = formData.get("file") as File | null;
    const documentTypeRaw = (formData.get("documentType") as string | null)?.trim();
    const documentType = documentTypeRaw || undefined;

    if (!file || file.size === 0) {
      return { success: false, error: "Choose a file to upload." };
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return { success: false, error: "File is too large (max 10 MB)." };
    }

    const mime = (file.type || "").toLowerCase();
    const allowed = new Set(["image/jpeg", "image/png", "application/pdf"]);
    const extOk = /\.(jpe?g|png|pdf)$/i.test(file.name);
    if (mime && !allowed.has(mime) && !extOk) {
      return { success: false, error: "Only PDF, JPG, and PNG files are allowed." };
    }
    if (!mime && !extOk) {
      return { success: false, error: "Only PDF, JPG, and PNG files are allowed." };
    }

    const usedMockStorage = !process.env.BLOB_READ_WRITE_TOKEN;
    const doc = await uploadAndCreateDocument({
      file,
      caseId: null,
      uploadedBy: session.user.id,
      documentType,
    });

    return {
      success: true,
      documentId: doc.id,
      storageKey: doc.storageKey,
      name: doc.name,
      mimeType: doc.mimeType ?? undefined,
      size: doc.size ?? undefined,
      documentType: doc.documentType ?? undefined,
      usedMockStorage,
    };
  } catch (e) {
    console.error("uploadWizardDocumentAction", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Upload failed",
    };
  }
}

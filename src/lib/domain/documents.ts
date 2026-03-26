import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { createDocument } from "@/data-access/document";

function safeFileSegment(name: string) {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
  return base || "file";
}

export async function createDocumentMetadata(input: {
  caseId: string | null;
  name: string;
  storageKey: string;
  uploadedBy?: string;
  mimeType?: string;
  size?: number;
  documentType?: string;
}) {
  if (input.caseId) {
    const caseRecord = await prisma.case.findUnique({
      where: { id: input.caseId },
      select: { id: true },
    });
    if (!caseRecord) {
      throw new Error("Case not found");
    }
  }

  return createDocument({
    caseId: input.caseId,
    name: input.name,
    storageKey: input.storageKey,
    uploadedBy: input.uploadedBy,
    mimeType: input.mimeType,
    size: input.size,
    documentType: input.documentType,
  });
}

export async function uploadAndCreateDocument(input: {
  file: File;
  caseId: string | null;
  uploadedBy?: string;
  documentType?: string;
}) {
  const storageFolder = input.caseId ?? "unassigned";
  let storageKey = `mock://documents/${storageFolder}/${Date.now()}-${safeFileSegment(input.file.name)}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const pathname = `documents/${storageFolder}/${Date.now()}-${safeFileSegment(input.file.name)}`;
    const blob = await put(pathname, input.file, {
      access: "public",
      addRandomSuffix: true,
    });
    storageKey = blob.url;
  }

  return createDocumentMetadata({
    caseId: input.caseId,
    name: input.file.name,
    storageKey,
    uploadedBy: input.uploadedBy,
    mimeType: input.file.type || undefined,
    size: input.file.size,
    documentType: input.documentType,
  });
}

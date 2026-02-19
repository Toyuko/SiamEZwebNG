import { prisma } from "@/lib/db";

export async function getDocumentById(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: { case: true, uploader: true },
  });
}

export async function getDocumentsByCaseId(caseId: string) {
  return prisma.document.findMany({
    where: { caseId },
    include: { uploader: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDocumentsByUserId(userId: string) {
  return prisma.document.findMany({
    where: { case: { userId } },
    include: { case: { include: { service: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDocument(data: {
  caseId: string;
  name: string;
  storageKey: string;
  uploadedBy?: string;
  mimeType?: string;
  size?: number;
  documentType?: string;
}) {
  return prisma.document.create({
    data: {
      caseId: data.caseId,
      name: data.name,
      storageKey: data.storageKey,
      uploadedBy: data.uploadedBy ?? undefined,
      mimeType: data.mimeType ?? undefined,
      size: data.size ?? undefined,
      documentType: data.documentType ?? undefined,
    },
  });
}

export async function linkDocumentsToCase(documentIds: string[], caseId: string) {
  return prisma.document.updateMany({
    where: { id: { in: documentIds } },
    data: { caseId },
  });
}

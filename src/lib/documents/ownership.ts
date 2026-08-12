import { prisma } from "@/lib/db";

/**
 * Attach only documents the caller owns (uploadedBy === userId).
 * Guests cannot re-bind arbitrary document IDs.
 */
export async function attachOwnedDocumentsToCase(opts: {
  caseId: string;
  documentIds: string[];
  userId: string | null | undefined;
}): Promise<number> {
  const ids = opts.documentIds.filter((id) => typeof id === "string" && id.trim() !== "");
  if (ids.length === 0) return 0;
  if (!opts.userId) {
    // Guests must not attach pre-existing document rows (IDOR vector).
    return 0;
  }

  const result = await prisma.document.updateMany({
    where: {
      id: { in: ids },
      uploadedBy: opts.userId,
    },
    data: { caseId: opts.caseId },
  });
  return result.count;
}

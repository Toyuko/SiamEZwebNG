import { prisma } from "@/lib/db";

/**
 * Customers may only attach documents to their own cases.
 * Staff/admin may attach to any case.
 */
export async function assertCanAttachDocumentToCase(
  caseId: string,
  userId: string,
  role: string
): Promise<void> {
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

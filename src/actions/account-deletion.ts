"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { adminProcessDeletionRequest } from "@/lib/account-deletion/service";

export async function getAccountDeletionRequests(options?: {
  status?: "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED" | "ALL";
}) {
  await requireStaff();
  const status = options?.status && options.status !== "ALL" ? options.status : undefined;

  return prisma.accountDeletionRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { requestedAt: "desc" },
    take: 200,
    include: {
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          action: true,
          createdAt: true,
          actorId: true,
          metadata: true,
        },
      },
      processedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function processAccountDeletionRequest(formData: FormData) {
  const staff = await requireStaff();
  const requestId = String(formData.get("requestId") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim() as "process" | "reject";
  const notes = String(formData.get("notes") ?? "").trim();

  if (!requestId || (action !== "process" && action !== "reject")) {
    return { error: "Invalid action." };
  }

  const result = await adminProcessDeletionRequest(
    requestId,
    staff.user.id,
    action,
    notes || undefined
  );

  revalidatePath("/admin/account-deletion-requests");
  if (!result.ok) return { error: result.error };
  return { ok: true as const };
}

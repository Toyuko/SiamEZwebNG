"use server";

import { prisma } from "@/lib/db";
import type { CaseStatus } from "@prisma/client";

export async function updateCaseStatus(caseId: string, status: CaseStatus) {
  return prisma.case.update({
    where: { id: caseId },
    data: { status },
  });
}

export async function assignStaff(caseId: string, userId: string, role: string = "support") {
  return prisma.staffAssignment.upsert({
    where: {
      caseId_userId: { caseId, userId },
    },
    create: { caseId, userId, role },
    update: { role },
  });
}

export async function addCaseNote(
  caseId: string,
  userId: string,
  content: string,
  isInternal: boolean = true
) {
  return prisma.caseNote.create({
    data: { caseId, userId, content, isInternal },
  });
}

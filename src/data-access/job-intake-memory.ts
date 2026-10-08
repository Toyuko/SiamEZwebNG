import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  createJobIntakeMemoryToken,
  isCaseId,
  isJobIntakeMemoryToken,
  sanitizeJobIntakeMemoryDetails,
  sanitizeJobIntakeMemoryNote,
  type JobIntakeMemoryDetails,
} from "@/lib/jobs/intake-memory";

export type StoredJobIntakeMemory = {
  token: string;
  details: JobIntakeMemoryDetails;
  memory: string;
  caseId: string | null;
  updatedAt: Date;
};

function toStored(row: {
  token: string;
  details: Prisma.JsonValue;
  memory: string;
  caseId: string | null;
  updatedAt: Date;
}): StoredJobIntakeMemory {
  return {
    token: row.token,
    details: sanitizeJobIntakeMemoryDetails(row.details),
    memory: row.memory,
    caseId: row.caseId,
    updatedAt: row.updatedAt,
  };
}

export async function getJobIntakeMemory(token: string): Promise<StoredJobIntakeMemory | null> {
  if (!isJobIntakeMemoryToken(token)) return null;
  const row = await prisma.jobIntakeMemory.findUnique({ where: { token } });
  return row ? toStored(row) : null;
}

export async function saveJobIntakeMemory(input: {
  token?: string | null;
  details: unknown;
  memory: unknown;
  caseId?: string | null;
}): Promise<{ ok: true; token: string } | { ok: false; reason: "not_found" }> {
  const details = sanitizeJobIntakeMemoryDetails(input.details) as unknown as Prisma.InputJsonValue;
  const memory = sanitizeJobIntakeMemoryNote(input.memory);
  const requestedCaseId = isCaseId(input.caseId)
    ? (await prisma.case.findUnique({ where: { id: input.caseId }, select: { id: true } }))?.id ?? null
    : null;
  const token = input.token?.trim() ?? "";

  if (token) {
    if (!isJobIntakeMemoryToken(token)) return { ok: false, reason: "not_found" };
    const existing = await prisma.jobIntakeMemory.findUnique({ where: { token } });
    if (!existing) return { ok: false, reason: "not_found" };
    await prisma.jobIntakeMemory.update({
      where: { token },
      data: {
        details,
        memory,
        caseId: existing.caseId ?? requestedCaseId,
      },
    });
    return { ok: true, token };
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const nextToken = createJobIntakeMemoryToken();
    try {
      await prisma.jobIntakeMemory.create({
        data: {
          token: nextToken,
          details,
          memory,
          caseId: requestedCaseId,
        },
      });
      return { ok: true, token: nextToken };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && attempt === 0) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("Unable to allocate a job intake link.");
}

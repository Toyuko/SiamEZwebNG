import { prisma } from "@/lib/db";

export async function priorVisitNotes(input: {
  email: string;
  userId: string | null;
}): Promise<string[]> {
  try {
    const rows = await prisma.licenceScreeningLesson.findMany({
      where: {
        OR: [{ email: input.email }, ...(input.userId ? [{ userId: input.userId }] : [])],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { outcome: true, note: true },
    });
    return rows.map((row) => `Earlier DLT visit (${row.outcome}): ${row.note}`);
  } catch (error) {
    if (missingTable(error)) return [];
    throw error;
  }
}

export function missingTable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2021"
  );
}

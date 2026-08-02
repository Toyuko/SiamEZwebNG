import { prisma } from "@/lib/db";
import { DEFAULT_RECOMMENDATION_EDGES } from "@/config/recommendation-graph";

export async function listRecommendationEdges() {
  return prisma.recommendationEdge.findMany({
    orderBy: [{ triggerKey: "asc" }, { sortOrder: "asc" }, { score: "desc" }],
  });
}

export async function upsertRecommendationEdge(input: {
  key: string;
  triggerKey: string;
  targetKind: string;
  targetKey: string;
  score: number;
  reasonEn: string;
  reasonTh?: string | null;
  active?: boolean;
  sortOrder?: number;
}) {
  return prisma.recommendationEdge.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      triggerKey: input.triggerKey,
      targetKind: input.targetKind,
      targetKey: input.targetKey,
      score: input.score,
      reasonEn: input.reasonEn,
      reasonTh: input.reasonTh ?? null,
      active: input.active ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
    update: {
      triggerKey: input.triggerKey,
      targetKind: input.targetKind,
      targetKey: input.targetKey,
      score: input.score,
      reasonEn: input.reasonEn,
      reasonTh: input.reasonTh ?? null,
      active: input.active ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function setRecommendationEdgeActive(id: string, active: boolean) {
  return prisma.recommendationEdge.update({
    where: { id },
    data: { active },
  });
}

/** Seed defaults when the table is empty. */
export async function seedDefaultRecommendationEdges() {
  const count = await prisma.recommendationEdge.count();
  if (count > 0) return { seeded: 0 };
  let seeded = 0;
  for (const edge of DEFAULT_RECOMMENDATION_EDGES) {
    await prisma.recommendationEdge.create({
      data: {
        key: edge.key,
        triggerKey: edge.triggerKey,
        targetKind: edge.targetKind,
        targetKey: edge.targetKey,
        score: edge.score,
        reasonEn: edge.reasonEn,
        reasonTh: edge.reasonTh,
        sortOrder: edge.sortOrder ?? 0,
        active: true,
      },
    });
    seeded += 1;
  }
  return { seeded };
}

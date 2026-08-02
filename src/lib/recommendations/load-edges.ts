import { DEFAULT_RECOMMENDATION_EDGES } from "@/config/recommendation-graph";
import { prisma } from "@/lib/db";
import type { RecommendationEdgeInput } from "./types";

/**
 * Load active recommendation edges from DB; fall back to config defaults.
 * Never throws — engine always has a graph.
 */
export async function loadRecommendationEdges(): Promise<RecommendationEdgeInput[]> {
  try {
    const rows = await prisma.recommendationEdge.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { score: "desc" }],
    });
    if (rows.length === 0) {
      return DEFAULT_RECOMMENDATION_EDGES;
    }
    return rows.map((row) => ({
      key: row.key,
      triggerKey: row.triggerKey as RecommendationEdgeInput["triggerKey"],
      targetKind: row.targetKind as RecommendationEdgeInput["targetKind"],
      targetKey: row.targetKey,
      score: row.score,
      reasonEn: row.reasonEn,
      reasonTh: row.reasonTh ?? row.reasonEn,
      sortOrder: row.sortOrder,
    }));
  } catch (error) {
    console.warn("recommendation edges unavailable, using defaults:", error);
    return DEFAULT_RECOMMENDATION_EDGES;
  }
}

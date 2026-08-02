"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import * as edgesDA from "@/data-access/recommendation-edges";

export async function listRecommendationEdgesAction() {
  await requireStaff();
  return edgesDA.listRecommendationEdges();
}

export async function upsertRecommendationEdgeAction(formData: FormData) {
  await requireStaff();
  const key = String(formData.get("key") ?? "").trim();
  const triggerKey = String(formData.get("triggerKey") ?? "").trim();
  const targetKind = String(formData.get("targetKind") ?? "").trim();
  const targetKey = String(formData.get("targetKey") ?? "").trim();
  const reasonEn = String(formData.get("reasonEn") ?? "").trim();
  const reasonTh = String(formData.get("reasonTh") ?? "").trim() || null;
  const score = Number(formData.get("score") ?? 50);
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const active = String(formData.get("active") ?? "true") === "true";

  if (!key || !triggerKey || !targetKind || !targetKey || !reasonEn) {
    return { success: false as const, error: "Missing required fields" };
  }

  await edgesDA.upsertRecommendationEdge({
    key,
    triggerKey,
    targetKind,
    targetKey,
    score: Number.isFinite(score) ? score : 50,
    reasonEn,
    reasonTh,
    active,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  });
  revalidatePath("/admin/recommendations");
  return { success: true as const };
}

export async function toggleRecommendationEdgeAction(id: string, active: boolean) {
  await requireStaff();
  await edgesDA.setRecommendationEdgeActive(id, active);
  revalidatePath("/admin/recommendations");
  return { success: true as const };
}

export async function seedRecommendationEdgesAction() {
  await requireStaff();
  const result = await edgesDA.seedDefaultRecommendationEdges();
  revalidatePath("/admin/recommendations");
  return { success: true as const, ...result };
}

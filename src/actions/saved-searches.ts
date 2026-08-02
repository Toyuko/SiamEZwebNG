"use server";

import { z } from "zod";
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
} from "@/data-access/saved-searches";
import { resolveEngagementOwner } from "@/actions/marketplace-engagement";

const savedSearchSchema = z.object({
  name: z.string().trim().min(1).max(80),
  listingType: z.enum(["vehicle", "property"]),
  query: z.record(z.string(), z.string().max(200)).refine(
    (query) => Object.keys(query).length <= 30,
    "Too many filters"
  ),
});

export async function listSavedSearchesAction() {
  return listSavedSearches(await resolveEngagementOwner());
}

export async function createSavedSearchAction(input: unknown) {
  const parsed = savedSearchSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" };
  try {
    const savedSearch = await createSavedSearch(await resolveEngagementOwner(), parsed.data);
    return { ok: true as const, savedSearch };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error && error.message === "Saved search limit reached" ? "limit" : "failed",
    };
  }
}

export async function deleteSavedSearchAction(id: string) {
  if (!id?.trim()) return { ok: false as const, error: "invalid" };
  await deleteSavedSearch(await resolveEngagementOwner(), id);
  return { ok: true as const };
}

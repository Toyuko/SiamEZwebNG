import { prisma } from "@/lib/db";

export const DEFAULT_FLAGS = {
  experimental_ai: false,
  marketplace_beta: true,
  new_workflows: false,
  beta_analytics: false,
  /** Soft-launch IA: prefer Services / Vehicles / RE / Concierge surfaces. */
  soft_launch: true,
  /** Master switch for the customer-facing AI Concierge shell. */
  concierge_enabled: true,
} as const;

export type FeatureFlagKey = keyof typeof DEFAULT_FLAGS;
let cache: { expiresAt: number; values: Map<string, boolean> } | null = null;

async function loadFlags() {
  if (cache && cache.expiresAt > Date.now()) return cache.values;
  const rows = await prisma.featureFlag.findMany({ select: { key: true, enabled: true } });
  const values = new Map(rows.map((row) => [row.key, row.enabled]));
  cache = { values, expiresAt: Date.now() + 30_000 };
  return values;
}

export async function isFeatureEnabled(key: FeatureFlagKey | string): Promise<boolean> {
  try {
    return (await loadFlags()).get(key) ?? (DEFAULT_FLAGS[key as FeatureFlagKey] ?? false);
  } catch {
    return DEFAULT_FLAGS[key as FeatureFlagKey] ?? false;
  }
}

export async function listFeatureFlags() {
  const rows = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
  const existing = new Map(rows.map((row) => [row.key, row]));
  return Object.entries(DEFAULT_FLAGS).map(([key, enabled]) => existing.get(key) ?? {
    id: key, key, enabled, description: null, updatedById: null, createdAt: new Date(0), updatedAt: new Date(0),
  });
}

export async function setFeatureFlag(key: FeatureFlagKey, enabled: boolean, updatedById: string) {
  const row = await prisma.featureFlag.upsert({
    where: { key },
    create: { key, enabled, updatedById },
    update: { enabled, updatedById },
  });
  cache = null;
  return row;
}

export function clearFeatureFlagCacheForTests() {
  cache = null;
}

import { isSoftLaunch } from "@/config/soft-launch";
import { prisma } from "@/lib/db";

export const DEFAULT_FLAGS = {
  experimental_ai: false,
  marketplace_beta: true,
  new_workflows: false,
  beta_analytics: false,
  /**
   * Soft-launch IA: prefer Services / Vehicles / RE / Concierge surfaces.
   * Operational switch is `SOFT_LAUNCH` env (`src/config/soft-launch.ts`);
   * this flag stays aligned so mobile clients see the same state via /api/v1/feature-flags.
   */
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
  // Soft-launch IA is driven by SOFT_LAUNCH so web + mobile stay synchronized.
  if (key === "soft_launch") {
    return isSoftLaunch();
  }
  try {
    return (await loadFlags()).get(key) ?? (DEFAULT_FLAGS[key as FeatureFlagKey] ?? false);
  } catch {
    return DEFAULT_FLAGS[key as FeatureFlagKey] ?? false;
  }
}

export async function listFeatureFlags() {
  const rows = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
  const existing = new Map(rows.map((row) => [row.key, row]));
  return Object.entries(DEFAULT_FLAGS).map(([key, enabled]) => {
    const row = existing.get(key) ?? {
      id: key,
      key,
      enabled,
      description: null,
      updatedById: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
    if (key === "soft_launch") {
      return { ...row, enabled: isSoftLaunch() };
    }
    return row;
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

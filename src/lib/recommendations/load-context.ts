/**
 * Server-side context hydration for the recommendations engine.
 * Keeps Prisma I/O out of the pure rules module.
 */

import { prisma } from "@/lib/db";
import {
  listRecentViewsForHub,
  listSavedListingsForHub,
  type HubListingCard,
} from "@/data-access/marketplace-engagement";
import { listGoalsForUser } from "@/data-access/goals";
import { parseStepTarget } from "@/lib/life-events";
import type { EngagementOwner } from "@/lib/marketplace-engagement";
import type {
  BookingSignal,
  EngagementListingSignal,
  GoalLifeEventSignal,
  RecommendationContext,
  RecommendationLocale,
} from "./types";

async function attachVehicleCategories(
  cards: HubListingCard[]
): Promise<EngagementListingSignal[]> {
  const vehicleIds = cards
    .filter((c) => c.listingType === "vehicle")
    .map((c) => c.listingId);
  const categoryById = new Map<string, string>();
  if (vehicleIds.length > 0) {
    const rows = await prisma.salesVehicle.findMany({
      where: { id: { in: vehicleIds } },
      select: { id: true, category: true },
    });
    for (const row of rows) {
      categoryById.set(row.id, row.category);
    }
  }

  return cards.map((card) => ({
    listingType: card.listingType,
    listingId: card.listingId,
    title: card.title,
    category:
      card.listingType === "vehicle"
        ? categoryById.get(card.listingId) ?? null
        : card.subtitle ?? null,
    source: card.viewedAt ? ("view" as const) : ("save" as const),
  }));
}

async function loadGoalSignals(userId: string): Promise<GoalLifeEventSignal[]> {
  try {
    const goals = await listGoalsForUser(userId);
    const out: GoalLifeEventSignal[] = [];

    for (const goal of goals.slice(0, 8)) {
      if (goal.status === "completed" || goal.status === "cancelled") continue;
      const signal: GoalLifeEventSignal = { title: goal.title };
      if (goal.lifeEvent) {
        signal.lifeEventKey = goal.lifeEvent.key;
        signal.lifeEventId = goal.lifeEvent.id;
      }
      out.push(signal);
    }

    // Incomplete life-event step services for active runs
    const runs = await prisma.lifeEventProgress.findMany({
      where: { userId, status: "active" },
      take: 4,
      include: {
        lifeEvent: {
          select: {
            key: true,
            titleEn: true,
            steps: { orderBy: { sortOrder: "asc" } },
          },
        },
        steps: true,
      },
    });

    for (const run of runs) {
      const incomplete: string[] = [];
      for (const step of run.lifeEvent.steps) {
        const sp = run.steps.find((s) => s.stepId === step.id);
        const status = sp?.status ?? "pending";
        if (status === "completed" || status === "skipped") continue;
        const target = parseStepTarget(step.target);
        if (target.serviceSlug) incomplete.push(target.serviceSlug);
      }
      const existing = out.find((g) => g.lifeEventKey === run.lifeEvent.key);
      if (existing) {
        existing.incompleteServiceSlugs = incomplete;
      } else {
        out.push({
          lifeEventKey: run.lifeEvent.key,
          title: run.lifeEvent.titleEn,
          incompleteServiceSlugs: incomplete,
        });
      }
    }

    return out;
  } catch {
    return [];
  }
}

async function loadBookingSignals(userId: string): Promise<BookingSignal[]> {
  try {
    const cases = await prisma.case.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        service: { select: { slug: true } },
      },
    });
    return cases
      .map((c) => c.service?.slug)
      .filter((slug): slug is string => Boolean(slug))
      .map((serviceSlug) => ({ serviceSlug }));
  } catch {
    return [];
  }
}

/**
 * Build a recommendation context for a portal user (or anon engagement owner).
 */
export async function loadRecommendationContext(input: {
  locale: RecommendationLocale;
  owner: EngagementOwner;
  userId?: string;
  limit?: number;
}): Promise<RecommendationContext> {
  const [saved, recent] = await Promise.all([
    listSavedListingsForHub(input.owner, 12).catch(() => [] as HubListingCard[]),
    listRecentViewsForHub(input.owner, 12).catch(() => [] as HubListingCard[]),
  ]);

  const merged = new Map<string, HubListingCard>();
  for (const card of [...recent, ...saved]) {
    const key = `${card.listingType}:${card.listingId}`;
    if (!merged.has(key)) merged.set(key, card);
  }

  const listings = await attachVehicleCategories([...merged.values()].slice(0, 16));

  const [goals, bookings] = input.userId
    ? await Promise.all([
        loadGoalSignals(input.userId),
        loadBookingSignals(input.userId),
      ])
    : [[], []];

  return {
    locale: input.locale,
    listings,
    goals,
    bookings,
    limit: input.limit ?? 6,
  };
}

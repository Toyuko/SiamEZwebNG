"use server";

import {
  getConciergeLlmApiKey,
  getConciergeLlmEndpoint,
  getConciergeModel,
  isConciergeLlmConfigured,
} from "@/lib/ai/config";
import { adaptConciergeReply } from "@/lib/ai/adapt-reply";
import { attachRecommendations, generateLocalConciergeReply } from "@/lib/ai/chat";
import { detectConciergeIntent } from "@/lib/ai/intents";
import {
  formatJourneySummary,
  isConciergeJourneyContext,
  updateJourneyContext,
  type ConciergeJourneyContext,
  type JourneyGoalHint,
} from "@/lib/ai/journey-context";
import { applyConciergeOrchestration } from "@/lib/ai/orchestrate";
import { buildRuleBasedReply } from "@/lib/ai/rule-replies";
import {
  buildConciergeSystemPrompt,
  sanitizeConciergeContent,
} from "@/lib/ai/sanitize-reply";
import { getServiceBySlug, searchCatalogServices } from "@/lib/ai/recommend";
import { bookingPathForSlug } from "@/lib/ai/tools/search-services";
import { openListingTool } from "@/lib/ai/tools/open-link";
import { recommendTool } from "@/lib/ai/tools/recommend";
import { searchUnifiedTool } from "@/lib/ai/tools/search-unified";
import type {
  ConciergeDeepLink,
  ConciergeLocale,
  ConciergeMessage,
  ConciergeReply,
} from "@/lib/ai/types";
import { getSession } from "@/lib/auth";
import { trackPlatformEvent } from "@/lib/analytics/track";
import { getConciergeSettings } from "@/lib/concierge-settings";
import {
  loadRecommendationContext,
  loadRecommendationEdges,
  type RecommendationSuggestion,
} from "@/lib/recommendations";
import { buildUserOwner } from "@/lib/marketplace-engagement";

export type ConciergeCapability = {
  llmEnabled: boolean;
  enabled: boolean;
};

export async function getConciergeCapability(): Promise<ConciergeCapability> {
  const settings = await getConciergeSettings();
  return {
    llmEnabled: isConciergeLlmConfigured(),
    enabled: settings.enabled,
  };
}

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

const MARKETPLACE_SEARCH_RE =
  /motorcycle|motorbike|scooter|\bbike\b|car|vehicle|honda|yamaha|toyota|condo|property|house|villa|listing|sales|มอเตอร์ไซค์|รถยนต์|คอนโด|บ้าน/i;

async function buildSearchDeepLinks(
  userMessage: string,
  locale: ConciergeLocale
): Promise<ConciergeDeepLink[]> {
  if (!MARKETPLACE_SEARCH_RE.test(userMessage)) return [];

  try {
    const result = await searchUnifiedTool({
      query: userMessage,
      locale,
      limitPerGroup: 3,
    });
    const links: ConciergeDeepLink[] = [];

    for (const hit of result.groups.vehicles) {
      const opened = openListingTool({
        listingType: "vehicle",
        listingId: hit.listingId,
        label: hit.title,
      });
      if (opened.ok) {
        links.push({
          href: opened.href,
          label: opened.label,
          kind: "listing",
        });
      }
    }

    for (const hit of result.groups.properties) {
      const opened = openListingTool({
        listingType: "property",
        listingId: hit.listingId,
        label: hit.title,
      });
      if (opened.ok) {
        links.push({
          href: opened.href,
          label: opened.label,
          kind: "listing",
        });
      }
    }

    return links;
  } catch {
    return [];
  }
}

function historyGoalsFromContext(input: {
  locale: ConciergeLocale;
  goals?: { lifeEventKey?: string; title?: string }[];
}): JourneyGoalHint[] {
  const out: JourneyGoalHint[] = [];
  for (const g of input.goals ?? []) {
    if (g.lifeEventKey) {
      out.push({
        key: `life_event:${g.lifeEventKey}`,
        label:
          g.title ||
          (input.locale === "th" ? "เหตุการณ์ชีวิตของคุณ" : "Your life event"),
        source: "life_event",
      });
    } else if (g.title) {
      out.push({
        key: `goal:${g.title.slice(0, 48)}`,
        label: g.title,
        source: "goal",
      });
    }
  }
  return out;
}

function enrichWithIntelligence(input: {
  reply: ConciergeReply;
  locale: ConciergeLocale;
  journey: ConciergeJourneyContext;
  goalChange: ReturnType<typeof updateJourneyContext>["goalChange"];
  suggestions: RecommendationSuggestion[];
  hasCustomerHistory: boolean;
}): ConciergeReply {
  return adaptConciergeReply({
    reply: input.reply,
    locale: input.locale,
    journey: input.journey,
    goalChange: input.goalChange,
    suggestions: input.suggestions,
    hasCustomerHistory: input.hasCustomerHistory,
  });
}

/**
 * Server-side concierge reply. Orchestrates unified search + recommendations.
 * Platform 2.1: journey memory, goal-change detection, explained recs, history adapt.
 * Uses OpenAI / AI Gateway when configured; otherwise rule-based reply.
 */
export async function requestConciergeReply(input: {
  locale: ConciergeLocale;
  messages: Pick<ConciergeMessage, "role" | "content">[];
  userMessage: string;
  /** Client-persisted journey snapshot from prior turns */
  journey?: ConciergeJourneyContext | null;
}): Promise<ConciergeReply> {
  const { locale, userMessage, messages } = input;
  const priorJourney =
    input.journey && isConciergeJourneyContext(input.journey)
      ? input.journey
      : null;

  const session = await getSession();
  const userId = session?.user?.id;
  void trackPlatformEvent("concierge_chat", { messageLength: userMessage.length }, userId, locale);

  const conciergeSettings = await getConciergeSettings();
  if (!conciergeSettings.enabled) {
    const content =
      locale === "th"
        ? `${conciergeSettings.fallbackMessageTh}\n\n${conciergeSettings.contactHintTh}`
        : `${conciergeSettings.fallbackMessageEn}\n\n${conciergeSettings.contactHintEn}`;
    return {
      content,
      recommendations: [],
      deepLinks: [
        {
          label: locale === "th" ? "ติดต่อ SiamEZ" : "Contact SiamEZ",
          href: "/contact",
          kind: "search",
        },
      ],
      mode: "rule",
    };
  }

  const knowledgeBlock = [
    locale === "th" ? conciergeSettings.knowledgeTh : conciergeSettings.knowledgeEn,
    locale === "th" ? conciergeSettings.faqTh : conciergeSettings.faqEn,
    locale === "th" ? conciergeSettings.contactHintTh : conciergeSettings.contactHintEn,
  ]
    .filter((block) => block.trim())
    .join("\n\n");
  const fallbackMessage =
    locale === "th"
      ? conciergeSettings.fallbackMessageTh
      : conciergeSettings.fallbackMessageEn;

  let recContextListings:
    | Awaited<ReturnType<typeof loadRecommendationContext>>["listings"]
    | undefined;
  let recContextGoals:
    | Awaited<ReturnType<typeof loadRecommendationContext>>["goals"]
    | undefined;
  let recContextBookings:
    | Awaited<ReturnType<typeof loadRecommendationContext>>["bookings"]
    | undefined;
  let hasCustomerHistory = false;
  let edges: Awaited<ReturnType<typeof loadRecommendationEdges>> | undefined;

  if (userId) {
    try {
      const [ctx, loadedEdges] = await Promise.all([
        loadRecommendationContext({
          locale,
          owner: buildUserOwner(userId),
          userId,
          limit: 8,
        }),
        loadRecommendationEdges(),
      ]);
      recContextListings = ctx.listings;
      recContextGoals = ctx.goals;
      recContextBookings = ctx.bookings;
      edges = loadedEdges;
      hasCustomerHistory =
        (ctx.listings?.length ?? 0) > 0 ||
        (ctx.goals?.length ?? 0) > 0 ||
        (ctx.bookings?.length ?? 0) > 0;
    } catch {
      // Degrade gracefully — rule path still works
    }
  }

  const { journey, goalChange } = updateJourneyContext({
    previous: priorJourney,
    userMessage,
    locale,
    historyGoals: historyGoalsFromContext({
      locale,
      goals: recContextGoals,
    }),
  });

  const searchDeepLinks = await buildSearchDeepLinks(userMessage, locale);
  const intent = detectConciergeIntent(userMessage);

  const rec = recommendTool({
    locale,
    query: userMessage,
    limit: 6,
    context: {
      listings: recContextListings,
      bookings: recContextBookings,
      goals: recContextGoals,
      edges,
    },
  });

  async function finalizeReply(
    reply: Awaited<ReturnType<typeof buildRuleBasedReply>>
  ): Promise<ConciergeReply> {
    let next = reply;
    if (intent) {
      next = await applyConciergeOrchestration({
        intent,
        locale,
        userMessage,
        baseReply: reply,
      });
    }
    return enrichWithIntelligence({
      reply: next,
      locale,
      journey,
      goalChange,
      suggestions: rec.suggestions,
      hasCustomerHistory,
    });
  }

  if (!isConciergeLlmConfigured()) {
    return finalizeReply(
      buildRuleBasedReply(userMessage, locale, {
        searchDeepLinks,
        engineSuggestions: rec.suggestions,
        journeySummary: formatJourneySummary(journey, locale),
      })
    );
  }

  const apiKey = getConciergeLlmApiKey();
  if (!apiKey) {
    return finalizeReply(
      buildRuleBasedReply(userMessage, locale, {
        searchDeepLinks,
        engineSuggestions: rec.suggestions,
        journeySummary: formatJourneySummary(journey, locale),
      })
    );
  }

  const catalogMatches = searchCatalogServices(userMessage, locale, 4);
  const systemPrompt = buildConciergeSystemPrompt({
    locale,
    allowedBookPaths: catalogMatches.map((s) => ({
      name: s.name,
      href: bookingPathForSlug(s.slug),
    })),
    knownListingPaths: searchDeepLinks.map((l) => ({
      label: l.label,
      href: l.href,
    })),
    journeySummary: formatJourneySummary(journey, locale),
    knowledgeBlock,
    fallbackMessage,
  });

  try {
    const res = await fetch(getConciergeLlmEndpoint(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getConciergeModel(),
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .slice(-12)
            .map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      return finalizeReply(
        buildRuleBasedReply(userMessage, locale, {
          searchDeepLinks,
          engineSuggestions: rec.suggestions,
        })
      );
    }

    const data = (await res.json()) as ChatCompletionResponse;
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      return finalizeReply(
        buildRuleBasedReply(userMessage, locale, {
          searchDeepLinks,
          engineSuggestions: rec.suggestions,
        })
      );
    }

    const content = sanitizeConciergeContent(raw);
    const reply = attachRecommendations(
      content || raw,
      userMessage,
      locale
    );
    const deepLinks: ConciergeDeepLink[] = [
      ...searchDeepLinks,
      ...rec.suggestions
        .filter((s) => s.kind === "listing" || s.kind === "life_event")
        .map((s) => ({
          href: s.href,
          label: s.title,
          kind: (s.kind === "listing" ? "listing" : "life_event") as ConciergeDeepLink["kind"],
          reason: s.reason,
        })),
    ];
    // Prefer engine service chips (with reasons) over catalog-only matches
    const engineServiceRecs = reply.recommendations.map((svc) => {
      const match = rec.suggestions.find(
        (s) => s.kind === "service" && s.id === svc.slug
      );
      return match ? { ...svc, reason: match.reason, score: match.score } : svc;
    });
    for (const s of rec.suggestions) {
      if (s.kind !== "service") continue;
      if (engineServiceRecs.some((r) => r.slug === s.id)) continue;
      const catalog = getServiceBySlug(s.id, locale);
      if (catalog) {
        engineServiceRecs.push({ ...catalog, reason: s.reason, score: s.score });
      }
    }

    return finalizeReply({
      ...reply,
      recommendations: engineServiceRecs.slice(0, 5),
      deepLinks,
    });
  } catch {
    return finalizeReply(
      buildRuleBasedReply(userMessage, locale, {
        searchDeepLinks,
        engineSuggestions: rec.suggestions,
      })
    );
  }
}

/** @deprecated Prefer requestConciergeReply — kept for callers expecting local-only. */
export async function requestLocalConciergeReply(input: {
  locale: ConciergeLocale;
  userMessage: string;
}): Promise<ConciergeReply> {
  return generateLocalConciergeReply(input.userMessage, input.locale);
}

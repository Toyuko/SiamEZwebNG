"use server";

import {
  getConciergeLlmApiKey,
  getConciergeLlmEndpoint,
  getConciergeModel,
  isConciergeLlmConfigured,
} from "@/lib/ai/config";
import { attachRecommendations, generateLocalConciergeReply } from "@/lib/ai/chat";
import { detectConciergeIntent } from "@/lib/ai/intents";
import { applyConciergeOrchestration } from "@/lib/ai/orchestrate";
import { buildRuleBasedReply } from "@/lib/ai/rule-replies";
import {
  buildConciergeSystemPrompt,
  sanitizeConciergeContent,
} from "@/lib/ai/sanitize-reply";
import { searchCatalogServices } from "@/lib/ai/recommend";
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

export type ConciergeCapability = {
  llmEnabled: boolean;
};

export async function getConciergeCapability(): Promise<ConciergeCapability> {
  return { llmEnabled: isConciergeLlmConfigured() };
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

/**
 * Server-side concierge reply. Orchestrates unified search + recommendations.
 * Uses OpenAI / AI Gateway when configured; otherwise rule-based reply.
 */
export async function requestConciergeReply(input: {
  locale: ConciergeLocale;
  messages: Pick<ConciergeMessage, "role" | "content">[];
  userMessage: string;
}): Promise<ConciergeReply> {
  const { locale, userMessage, messages } = input;

  const searchDeepLinks = await buildSearchDeepLinks(userMessage, locale);
  const intent = detectConciergeIntent(userMessage);

  async function finalizeReply(reply: Awaited<ReturnType<typeof buildRuleBasedReply>>) {
    if (!intent) return reply;
    return applyConciergeOrchestration({
      intent,
      locale,
      userMessage,
      baseReply: reply,
    });
  }

  if (!isConciergeLlmConfigured()) {
    return finalizeReply(buildRuleBasedReply(userMessage, locale, { searchDeepLinks }));
  }

  const apiKey = getConciergeLlmApiKey();
  if (!apiKey) {
    return finalizeReply(buildRuleBasedReply(userMessage, locale, { searchDeepLinks }));
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
      return finalizeReply(buildRuleBasedReply(userMessage, locale, { searchDeepLinks }));
    }

    const data = (await res.json()) as ChatCompletionResponse;
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      return finalizeReply(buildRuleBasedReply(userMessage, locale, { searchDeepLinks }));
    }

    const content = sanitizeConciergeContent(raw);
    const reply = attachRecommendations(
      content || raw,
      userMessage,
      locale
    );
    const rec = recommendTool({ locale, query: userMessage, limit: 4 });
    const deepLinks: ConciergeDeepLink[] = [
      ...searchDeepLinks,
      ...rec.suggestions
        .filter((s) => s.kind === "listing" || s.kind === "life_event")
        .map((s) => ({
          href: s.href,
          label: s.title,
          kind: (s.kind === "listing" ? "listing" : "life_event") as ConciergeDeepLink["kind"],
        })),
    ];
    return finalizeReply({ ...reply, deepLinks });
  } catch {
    return finalizeReply(buildRuleBasedReply(userMessage, locale, { searchDeepLinks }));
  }
}

/** @deprecated Prefer requestConciergeReply — kept for callers expecting local-only. */
export async function requestLocalConciergeReply(input: {
  locale: ConciergeLocale;
  userMessage: string;
}): Promise<ConciergeReply> {
  return generateLocalConciergeReply(input.userMessage, input.locale);
}

import { buildRuleBasedReply } from "@/lib/ai/rule-replies";
import { searchCatalogServices } from "@/lib/ai/recommend";
import type {
  ConciergeLocale,
  ConciergeMessage,
  ConciergeReply,
} from "@/lib/ai/types";

export function createMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createUserMessage(content: string): ConciergeMessage {
  return {
    id: createMessageId(),
    role: "user",
    content,
    createdAt: new Date().toISOString(),
    kind: "text",
  };
}

export function createAssistantPlaceholder(): ConciergeMessage {
  return {
    id: createMessageId(),
    role: "assistant",
    content: "",
    createdAt: new Date().toISOString(),
    kind: "text",
    streaming: true,
    recommendations: [],
  };
}

/**
 * Local reply path (no API key). Always safe for client use.
 */
export function generateLocalConciergeReply(
  userMessage: string,
  locale: ConciergeLocale
): ConciergeReply {
  return buildRuleBasedReply(userMessage, locale);
}

/**
 * Enrich an LLM text reply with catalog recommendations from the user query.
 */
export function attachRecommendations(
  content: string,
  userMessage: string,
  locale: ConciergeLocale
): ConciergeReply {
  const recommendations = searchCatalogServices(userMessage, locale, 4);
  return {
    content,
    recommendations,
    mode: "llm",
  };
}

export function buildWelcomeMessage(locale: ConciergeLocale): ConciergeMessage {
  const reply = buildRuleBasedReply(locale === "th" ? "สวัสดี" : "hello", locale);
  return {
    id: createMessageId(),
    role: "assistant",
    content: reply.content,
    createdAt: new Date().toISOString(),
    kind: "recommendations",
    recommendations: reply.recommendations,
  };
}

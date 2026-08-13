/** Shared AI Concierge types — storage-agnostic for localStorage now, server later. */

import type {
  ConciergeJourneyContext,
  GoalChangeSignal,
} from "@/lib/ai/journey-context";

export type ConciergeLocale = "en" | "th";

export type ConciergeRole = "user" | "assistant" | "system";

export type ConciergeMessageKind = "text" | "recommendations" | "quick-start";

export type ConciergeServiceRecommendation = {
  slug: string;
  name: string;
  shortDescription: string;
  score?: number;
  /** Configurable recommendation reason (engine / admin graph). */
  reason?: string;
};

/** Cross-division deep links (listings use cuid paths). */
export type ConciergeDeepLink = {
  href: string;
  label: string;
  kind: "listing" | "service" | "life_event" | "search" | "live_chat";
  /** Why this link was suggested. */
  reason?: string;
};

export type ConciergeMessage = {
  id: string;
  role: ConciergeRole;
  content: string;
  createdAt: string;
  kind?: ConciergeMessageKind;
  recommendations?: ConciergeServiceRecommendation[];
  deepLinks?: ConciergeDeepLink[];
  /** True while tokens are still arriving */
  streaming?: boolean;
};

export type ConciergeSession = {
  id: string;
  locale: ConciergeLocale;
  messages: ConciergeMessage[];
  updatedAt: string;
  /** Schema version for future server sync migrations */
  version: 1;
  /** Platform 2.1 — durable client-side journey memory */
  journey?: ConciergeJourneyContext;
};

export type ConciergeReply = {
  content: string;
  recommendations: ConciergeServiceRecommendation[];
  deepLinks?: ConciergeDeepLink[];
  mode: "rule" | "llm" | "mock-stream";
  /** Updated journey snapshot for the client to persist */
  journey?: ConciergeJourneyContext;
  goalChange?: GoalChangeSignal;
  /** Bullet explanations attached to the reply */
  explanations?: string[];
};

export type ConciergeQuickAction = {
  id: string;
  /** i18n key under concierge.quickActions.* */
  labelKey: string;
  /** User message injected when clicked, or null if navigation-only */
  prompt?: string;
  /** Direct booking slug handoff */
  bookSlug?: string;
  /** Popular services strip */
  showPopular?: boolean;
};

/** Pluggable persistence — LocalStorageConversationStore today; HTTP/DB later. */
export interface ConversationStore {
  load(sessionId: string): ConciergeSession | null | Promise<ConciergeSession | null>;
  save(session: ConciergeSession): void | Promise<void>;
  clear(sessionId: string): void | Promise<void>;
}

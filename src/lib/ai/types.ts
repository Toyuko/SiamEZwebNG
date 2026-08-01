/** Shared AI Concierge types — storage-agnostic for localStorage now, server later. */

export type ConciergeLocale = "en" | "th";

export type ConciergeRole = "user" | "assistant" | "system";

export type ConciergeMessageKind = "text" | "recommendations" | "quick-start";

export type ConciergeServiceRecommendation = {
  slug: string;
  name: string;
  shortDescription: string;
  score?: number;
};

export type ConciergeMessage = {
  id: string;
  role: ConciergeRole;
  content: string;
  createdAt: string;
  kind?: ConciergeMessageKind;
  recommendations?: ConciergeServiceRecommendation[];
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
};

export type ConciergeReply = {
  content: string;
  recommendations: ConciergeServiceRecommendation[];
  mode: "rule" | "llm" | "mock-stream";
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

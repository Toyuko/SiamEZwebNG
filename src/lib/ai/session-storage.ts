import {
  CONCIERGE_SESSION_ID_KEY,
  CONCIERGE_SESSION_STORAGE_KEY,
} from "@/lib/ai/config";
import {
  emptyJourneyContext,
  isConciergeJourneyContext,
} from "@/lib/ai/journey-context";
import type {
  ConciergeLocale,
  ConciergeSession,
  ConversationStore,
} from "@/lib/ai/types";

export function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `concierge-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptySession(locale: ConciergeLocale, id?: string): ConciergeSession {
  const now = new Date().toISOString();
  return {
    id: id ?? createSessionId(),
    locale,
    messages: [],
    updatedAt: now,
    version: 1,
    journey: emptyJourneyContext(),
  };
}

function isConciergeSession(value: unknown): value is ConciergeSession {
  if (!value || typeof value !== "object") return false;
  const v = value as ConciergeSession;
  return (
    typeof v.id === "string" &&
    (v.locale === "en" || v.locale === "th") &&
    Array.isArray(v.messages) &&
    v.version === 1
  );
}

/** Normalize legacy sessions missing journey memory. */
export function withJourney(session: ConciergeSession): ConciergeSession {
  if (session.journey && isConciergeJourneyContext(session.journey)) {
    return session;
  }
  return { ...session, journey: emptyJourneyContext() };
}

/**
 * Browser localStorage store. Swap for a server-backed ConversationStore
 * without changing chat hooks (same interface).
 */
export class LocalStorageConversationStore implements ConversationStore {
  constructor(
    private readonly storageKey = CONCIERGE_SESSION_STORAGE_KEY,
    private readonly idKey = CONCIERGE_SESSION_ID_KEY
  ) {}

  private getStorage(): Storage | null {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  getOrCreateSessionId(): string {
    const storage = this.getStorage();
    if (!storage) return createSessionId();
    const existing = storage.getItem(this.idKey);
    if (existing) return existing;
    const id = createSessionId();
    storage.setItem(this.idKey, id);
    return id;
  }

  load(sessionId: string): ConciergeSession | null {
    const storage = this.getStorage();
    if (!storage) return null;
    try {
      const raw = storage.getItem(this.storageKey);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!isConciergeSession(parsed)) return null;
      if (parsed.id !== sessionId) return null;
      return withJourney(parsed);
    } catch {
      return null;
    }
  }

  save(session: ConciergeSession): void {
    const storage = this.getStorage();
    if (!storage) return;
    try {
      storage.setItem(this.idKey, session.id);
      storage.setItem(
        this.storageKey,
        JSON.stringify({ ...session, updatedAt: new Date().toISOString() })
      );
    } catch {
      // Quota / private mode — ignore; in-memory session still works.
    }
  }

  clear(sessionId: string): void {
    const storage = this.getStorage();
    if (!storage) return;
    try {
      const current = this.load(sessionId);
      if (current || storage.getItem(this.idKey) === sessionId) {
        storage.removeItem(this.storageKey);
      }
    } catch {
      // ignore
    }
  }
}

/** In-memory store for tests / SSR-safe fallbacks. */
export class MemoryConversationStore implements ConversationStore {
  private sessions = new Map<string, ConciergeSession>();

  load(sessionId: string): ConciergeSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  save(session: ConciergeSession): void {
    this.sessions.set(session.id, {
      ...session,
      updatedAt: new Date().toISOString(),
    });
  }

  clear(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

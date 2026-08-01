"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LocalStorageConversationStore,
  createEmptySession,
} from "@/lib/ai/session-storage";
import { buildWelcomeMessage } from "@/lib/ai/chat";
import type {
  ConciergeLocale,
  ConciergeMessage,
  ConciergeSession,
} from "@/lib/ai/types";

const defaultStore = new LocalStorageConversationStore();

export type UseConciergeSessionOptions = {
  locale: ConciergeLocale;
  store?: LocalStorageConversationStore;
  /** Inject welcome assistant message when session is empty */
  withWelcome?: boolean;
};

export function useConciergeSession({
  locale,
  store = defaultStore,
  withWelcome = true,
}: UseConciergeSessionOptions) {
  const [session, setSession] = useState<ConciergeSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const id = store.getOrCreateSessionId();
    const existing = store.load(id);
    if (existing) {
      const next =
        existing.locale === locale
          ? existing
          : { ...existing, locale };
      setSession(next);
      if (next !== existing) store.save(next);
    } else {
      const fresh = createEmptySession(locale, id);
      if (withWelcome) {
        fresh.messages = [buildWelcomeMessage(locale)];
      }
      store.save(fresh);
      setSession(fresh);
    }
    setHydrated(true);
  }, [locale, store, withWelcome]);

  const persist = useCallback(
    (updater: (prev: ConciergeSession) => ConciergeSession) => {
      setSession((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        store.save(next);
        return next;
      });
    },
    [store]
  );

  const setMessages = useCallback(
    (messages: ConciergeMessage[]) => {
      persist((prev) => ({ ...prev, messages }));
    },
    [persist]
  );

  const appendMessage = useCallback(
    (message: ConciergeMessage) => {
      persist((prev) => ({
        ...prev,
        messages: [...prev.messages, message],
      }));
    },
    [persist]
  );

  const updateMessage = useCallback(
    (id: string, patch: Partial<ConciergeMessage>) => {
      persist((prev) => ({
        ...prev,
        messages: prev.messages.map((m) =>
          m.id === id ? { ...m, ...patch } : m
        ),
      }));
    },
    [persist]
  );

  const clearHistory = useCallback(() => {
    if (!session) return;
    const fresh = createEmptySession(locale, session.id);
    if (withWelcome) {
      fresh.messages = [buildWelcomeMessage(locale)];
    }
    store.save(fresh);
    setSession(fresh);
  }, [locale, session, store, withWelcome]);

  return {
    session,
    messages: session?.messages ?? [],
    hydrated,
    setMessages,
    appendMessage,
    updateMessage,
    clearHistory,
  };
}

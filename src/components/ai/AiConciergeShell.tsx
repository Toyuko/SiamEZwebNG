"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ConciergeFab } from "@/components/ai/ConciergeFab";
import { ConciergePanel } from "@/components/ai/ConciergePanel";
import { useConciergeChat } from "@/hooks/ai/useConciergeChat";
import { useConciergeSession } from "@/hooks/ai/useConciergeSession";
import { getConciergeCapability } from "@/lib/ai/actions";
import { CONCIERGE_OPEN_EVENT, type ConciergeOpenDetail } from "@/lib/ai/concierge-events";
import type { ConciergeLocale } from "@/lib/ai/types";
import { trackEvent } from "@/lib/analytics";
import {
  dispatchOpenTawk,
  isTawkConfigured,
  summarizeConciergeForTawk,
  TAWK_MAXIMIZED_EVENT,
} from "@/lib/tawk";

export type AiConciergeShellProps = {
  /**
   * FAB placement. Public pages use `stacked` so the button sits above tawk.to / WhatsApp.
   * Portal pages can use `default` (bottom-right).
   */
  placement?: "default" | "stacked";
  /** Optional server-provided flag; client still re-checks capability. */
  llmEnabled?: boolean;
};

function toConciergeLocale(locale: string): ConciergeLocale {
  return locale === "th" ? "th" : "en";
}

export function AiConciergeShell({
  placement = "stacked",
  llmEnabled: llmEnabledProp = false,
}: AiConciergeShellProps) {
  const localeRaw = useLocale();
  const locale = toConciergeLocale(localeRaw);
  const t = useTranslations("concierge");
  const [open, setOpen] = useState(false);
  const [llmEnabled, setLlmEnabled] = useState(llmEnabledProp);
  const startedRef = useRef(false);
  const liveChatEnabled = isTawkConfigured();

  const {
    messages,
    journey,
    hydrated,
    appendMessage,
    updateMessage,
    setJourney,
    clearHistory,
  } = useConciergeSession({ locale });

  const { sendMessage, isStreaming } = useConciergeChat({
    locale,
    messages,
    appendMessage,
    updateMessage,
    preferLlm: true,
    journey,
    onJourneyUpdate: setJourney,
  });

  const openLiveChat = () => {
    if (!liveChatEnabled) return;
    dispatchOpenTawk({ summary: summarizeConciergeForTawk(messages) });
    setOpen(false);
  };

  useEffect(() => {
    function onOpenConcierge(event: Event) {
      const detail = (event as CustomEvent<ConciergeOpenDetail>).detail;
      setOpen(true);
      if (detail?.prompt?.trim()) {
        void sendMessage(detail.prompt);
      }
    }
    window.addEventListener(CONCIERGE_OPEN_EVENT, onOpenConcierge);
    return () => window.removeEventListener(CONCIERGE_OPEN_EVENT, onOpenConcierge);
  }, [sendMessage]);

  useEffect(() => {
    if (!liveChatEnabled) return;
    function onTawkMaximized() {
      setOpen(false);
    }
    window.addEventListener(TAWK_MAXIMIZED_EVENT, onTawkMaximized);
    return () => window.removeEventListener(TAWK_MAXIMIZED_EVENT, onTawkMaximized);
  }, [liveChatEnabled]);

  useEffect(() => {
    if (!open || startedRef.current) return;
    startedRef.current = true;
    trackEvent("ai_concierge_started", { locale });
  }, [open, locale]);

  useEffect(() => {
    let cancelled = false;
    getConciergeCapability()
      .then((cap) => {
        if (!cancelled) setLlmEnabled(cap.llmEnabled);
      })
      .catch(() => {
        if (!cancelled) setLlmEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const labels = useMemo(
    () => ({
      title: t("title"),
      subtitle: t("subtitle"),
      offlineHint: t("offlineHint"),
      clear: t("clear"),
      closeLabel: t("closeLabel"),
      book: t("book"),
      empty: t("empty"),
      placeholder: t("placeholder"),
      send: t("send"),
      listening: t("listening"),
      voiceAria: t("voiceAria"),
      voiceUnsupported: t("voiceUnsupported"),
      voicePermissionDenied: t("voicePermissionDenied"),
      voiceNoSpeech: t("voiceNoSpeech"),
      voiceError: t("voiceError"),
      popular: t("quickActions.popular"),
      startBooking: t("quickActions.startBooking"),
      help: t("quickActions.help"),
      findVehicles: t("quickActions.findVehicles"),
      openLink: t("openLink"),
      openLabel: t("openLabel"),
      talkToPerson: t("talkToPerson"),
    }),
    [t]
  );

  if (!hydrated) {
    return (
      <ConciergeFab
        open={false}
        onToggle={() => setOpen(true)}
        label={labels.openLabel}
        closeLabel={labels.closeLabel}
        placement={placement}
      />
    );
  }

  return (
    <>
      <ConciergeFab
        open={open}
        onToggle={() => setOpen((v) => !v)}
        label={labels.openLabel}
        closeLabel={labels.closeLabel}
        placement={placement}
      />
      <ConciergePanel
        open={open}
        locale={locale}
        messages={messages}
        isStreaming={isStreaming}
        llmEnabled={llmEnabled}
        labels={{
          title: labels.title,
          subtitle: labels.subtitle,
          offlineHint: labels.offlineHint,
          clear: labels.clear,
          closeLabel: labels.closeLabel,
          book: labels.book,
          empty: labels.empty,
          placeholder: labels.placeholder,
          send: labels.send,
          listening: labels.listening,
          voiceAria: labels.voiceAria,
          voiceUnsupported: labels.voiceUnsupported,
          voicePermissionDenied: labels.voicePermissionDenied,
          voiceNoSpeech: labels.voiceNoSpeech,
          voiceError: labels.voiceError,
          popular: labels.popular,
          startBooking: labels.startBooking,
          help: labels.help,
          findVehicles: labels.findVehicles,
          openLink: labels.openLink,
          talkToPerson: labels.talkToPerson,
        }}
        liveChatEnabled={liveChatEnabled}
        onClose={() => setOpen(false)}
        onSend={sendMessage}
        onClear={clearHistory}
        onLiveChat={liveChatEnabled ? openLiveChat : undefined}
      />
    </>
  );
}

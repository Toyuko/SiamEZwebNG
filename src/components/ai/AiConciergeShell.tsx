"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ConciergeFab } from "@/components/ai/ConciergeFab";
import { ConciergePanel } from "@/components/ai/ConciergePanel";
import { useConciergeChat } from "@/hooks/ai/useConciergeChat";
import { useConciergeSession } from "@/hooks/ai/useConciergeSession";
import { getConciergeCapability } from "@/lib/ai/actions";
import type { ConciergeLocale } from "@/lib/ai/types";

export type AiConciergeShellProps = {
  /**
   * FAB placement. Public pages use `stacked` so the button sits above WhatsApp.
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

  const { messages, hydrated, appendMessage, updateMessage, clearHistory } =
    useConciergeSession({ locale });

  const { sendMessage, isStreaming } = useConciergeChat({
    locale,
    messages,
    appendMessage,
    updateMessage,
    preferLlm: true,
  });

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
        }}
        onClose={() => setOpen(false)}
        onSend={sendMessage}
        onClear={clearHistory}
      />
    </>
  );
}

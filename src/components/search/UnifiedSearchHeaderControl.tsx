"use client";

import { useLocale, useTranslations } from "next-intl";
import { UnifiedSearchTrigger } from "@/components/search/UnifiedSearchPalette";

/** Public header entry for site-wide unified search (services ∪ listings ∪ help). */
export function UnifiedSearchHeaderControl({ className }: { className?: string }) {
  const t = useTranslations("unifiedSearch");
  const locale = useLocale();
  const searchLocale = locale === "th" ? "th" : "en";

  return (
    <UnifiedSearchTrigger
      className={className}
      locale={searchLocale}
      labels={{
        placeholder: t("placeholder"),
        // Keep literal "{query}" for UnifiedSearchPalette.replace — next-intl
        // requires the ICU var at format time.
        empty: t("empty", { query: "{query}" }),
        loading: t("loading"),
        shortcutHint: t("shortcutHint"),
        navigateHint: t("navigateHint"),
        groupServices: t("groupServices"),
        groupVehicles: t("groupVehicles"),
        groupProperties: t("groupProperties"),
        groupHelp: t("groupHelp"),
        groupLifeEvents: t("groupLifeEvents"),
        groupGoals: t("groupGoals"),
        groupBookings: t("groupBookings"),
        close: t("close"),
        openAria: t("openAria"),
      }}
    />
  );
}

import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { ServicesPageClient } from "./ServicesPageClient";
import { getPublicServicesList } from "@/data-access/service";
import { serviceDirectoryCategoryKeys, serviceBadgeKeys } from "@/config/service-catalog";
import { enrichServicesList } from "@/lib/service-display";
import { ServicesJsonLd } from "@/components/services/ServicesJsonLd";
import { site } from "@/config/site";
import type { ServiceSortKey } from "@/lib/service-display";
import type { ServiceBadgeKey } from "@/config/service-catalog";

const sortKeys: ServiceSortKey[] = ["popular", "fastest", "priceLowToHigh", "newServices"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "services" });
  const baseUrl = site.url.replace(/\/$/, "");

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    keywords: t("metaKeywords"),
    alternates: {
      canonical: `${baseUrl}/${locale}/services`,
      languages: {
        en: `${baseUrl}/en/services`,
        th: `${baseUrl}/th/services`,
      },
    },
    openGraph: {
      title: `${t("metaTitle")} | ${site.name}`,
      description: t("metaDescription"),
      url: `${baseUrl}/${locale}/services`,
      siteName: site.name,
      locale: locale === "th" ? "th_TH" : "en_US",
      type: "website",
    },
  };
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSession();
  const isLoggedIn = !!session?.user;
  const t = await getTranslations("services");

  const list = await getPublicServicesList().catch(() => []);
  const enriched = enrichServicesList(list, locale);

  const directoryCategories = Object.fromEntries(
    serviceDirectoryCategoryKeys.map((key) => [key, t(`directoryCategories.${key}`)])
  );

  const sortOptions = Object.fromEntries(
    sortKeys.map((key) => [key, t(`sortOptions.${key}`)])
  ) as Record<ServiceSortKey, string>;

  const badges = Object.fromEntries(
    serviceBadgeKeys.map((key) => [key, t(`badges.${key}`)])
  ) as Record<ServiceBadgeKey, string>;

  const directoryLabels = {
    popularTitle: t("popularTitle"),
    popularSubtitle: t("popularSubtitle"),
    allCategory: t("allCategory"),
    sortLabel: t("sortLabel"),
    resultsCount: t("resultsCount"),
    noResultsTitle: t("searchNoResults"),
    noResultsDescription: t("emptyStateDescription"),
    lineCta: t("emptyStateLineCta"),
    lineShortcut: t("lineShortcut"),
    processingTime: t("processingTime"),
    requirements: t("requirementsSummary"),
    journeyTitle: t("journeyTitle"),
    journeySteps: t.raw("journeySteps") as string[],
    trustTitle: t("trustTitle"),
    trustSubtitle: t("trustSubtitle"),
    trustItems: t.raw("trustItems") as { title: string; text: string }[],
    directoryCategories,
    sortOptions,
    badges,
  };

  return (
    <>
      <ServicesJsonLd
        services={enriched}
        locale={locale}
        pageName={t("title")}
        pageDescription={t("description")}
      />
      <ServicesPageClient
        services={enriched}
        title={t("title")}
        description={t("description")}
        searchPlaceholder={t("searchPlaceholder")}
        searchButtonText={t("searchButton")}
        bookNowLabel={t("bookNow")}
        detailsLabel={t("details")}
        priceLabel={t("from")}
        isLoggedIn={isLoggedIn}
        locale={locale}
        directoryLabels={directoryLabels}
        searchLabels={{
          placeholder: t("searchCommandPlaceholder"),
          empty: t("searchNoResults"),
          listening: t("searchListening"),
          voiceUnsupported: t("searchVoiceUnsupported"),
          voicePermissionDenied: t("searchVoicePermissionDenied"),
          voiceNoSpeech: t("searchVoiceNoSpeech"),
          voiceError: t("searchVoiceError"),
          voiceSearchAria: t("searchVoiceAria"),
          shortcutHint: t("searchShortcutHint"),
          navigateHint: t("searchNavigateHint"),
        }}
      />
    </>
  );
}

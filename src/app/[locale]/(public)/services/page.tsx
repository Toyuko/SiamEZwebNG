import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { ServicesPageClient } from "./ServicesPageClient";
import { getPublicServicesList } from "@/data-access/service";
import { serviceSearchCategoryKeys } from "@/config/service-search";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "services" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
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

  const categoryLabels = Object.fromEntries(
    serviceSearchCategoryKeys.map((key) => [key, t(`searchCategories.${key}`)])
  );

  return (
    <ServicesPageClient
      services={list}
      title={t("title")}
      description={t("description")}
      searchPlaceholder={t("searchPlaceholder")}
      searchButtonText={t("searchButton")}
      bookNowLabel={t("bookNow")}
      detailsLabel={t("details")}
      priceLabel={t("from")}
      isLoggedIn={isLoggedIn}
      locale={locale}
      categoryLabels={categoryLabels}
      noResultsMessage={t("searchNoResults")}
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
  );
}

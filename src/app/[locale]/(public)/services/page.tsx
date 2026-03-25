import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { ServicesPageClient } from "./ServicesPageClient";
import { getPublicServicesList } from "@/data-access/service";

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
  const [t] = await Promise.all([
    getTranslations("services"),
  ]);

  const list = await getPublicServicesList().catch(() => []);

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
    />
  );
}

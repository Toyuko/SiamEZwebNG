import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { ServicesPageClient } from "./ServicesPageClient";
import { getServicesList } from "@/data-access/service";
import {
  serviceSlugs,
  serviceDisplayNames,
  serviceShortDescriptions,
} from "@/config/services";

type DisplayService = {
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  priceAmount: number | null;
  priceCurrency: string | null;
};

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
  const [t] = await Promise.all([
    getTranslations("services"),
  ]);

  const services = await getServicesList().catch(() => []);
  const list: DisplayService[] =
    services.length > 0
      ? services.map((s) => ({
          slug: s.slug,
          name: s.name,
          shortDescription: s.shortDescription,
          description: s.description,
          priceAmount: s.priceAmount,
          priceCurrency: s.priceCurrency,
        }))
      : serviceSlugs.map((slug) => ({
          slug,
          name: serviceDisplayNames[slug],
          shortDescription: serviceShortDescriptions[slug],
          description: null,
          priceAmount: null,
          priceCurrency: null,
        }));

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
    />
  );
}

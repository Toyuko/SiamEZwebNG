import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/sections/PageHero";
import { VehicleHub } from "@/components/vehicle-intake/VehicleHub";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "vehicleIntake" });
  return buildPageMetadata({
    locale,
    path: "/vehicle",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function VehicleHubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("vehicleIntake");
  return (
    <>
      <PageHero title={t("hubTitle")} description={t("hubDescription")} />
      <section className="container mx-auto px-4 py-8 sm:py-12">
        <Suspense>
          <VehicleHub locale={locale} />
        </Suspense>
      </section>
    </>
  );
}

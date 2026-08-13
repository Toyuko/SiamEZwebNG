import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/sections/PageHero";
import { SellVehicleForm } from "@/components/vehicle-intake/SellVehicleForm";
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
    path: "/vehicle/sell",
    title: t("sellMetaTitle"),
    description: t("sellBlurb"),
  });
}

export default async function SellVehiclePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("vehicleIntake");
  return (
    <>
      <PageHero title={t("sellTitle")} description={t("sellBlurb")} />
      <section className="container mx-auto px-4 py-8 sm:py-12">
        <Suspense>
          <SellVehicleForm />
        </Suspense>
      </section>
    </>
  );
}

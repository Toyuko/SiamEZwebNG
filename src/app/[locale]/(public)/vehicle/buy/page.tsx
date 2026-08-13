import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/sections/PageHero";
import { BuyVehicleForm } from "@/components/vehicle-intake/BuyVehicleForm";
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
    path: "/vehicle/buy",
    title: t("buyMetaTitle"),
    description: t("buyBlurb"),
  });
}

export default async function BuyVehiclePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("vehicleIntake");
  return (
    <>
      <PageHero title={t("buyTitle")} description={t("buyBlurb")} />
      <section className="container mx-auto px-4 py-8 sm:py-12">
        <Suspense>
          <BuyVehicleForm />
        </Suspense>
      </section>
    </>
  );
}

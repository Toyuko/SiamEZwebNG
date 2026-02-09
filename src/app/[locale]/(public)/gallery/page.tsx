import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/sections/PageHero";
import { PhotoGallery } from "@/components/sections/PhotoGallery";
import { DisclaimerBanner } from "@/components/sections/DisclaimerBanner";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "gallery" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tDisclaimer] = await Promise.all([
    getTranslations("gallery"),
    getTranslations("disclaimer"),
  ]);

  return (
    <>
      <PageHero
        title={t("title")}
        description={t("description")}
      />
      <PhotoGallery />
      <DisclaimerBanner text={tDisclaimer("text")} />
    </>
  );
}

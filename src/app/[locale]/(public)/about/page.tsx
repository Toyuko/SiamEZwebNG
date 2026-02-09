import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/sections/PageHero";
import { WhyChooseSection } from "@/components/sections/WhyChooseSection";
import { DisclaimerBanner } from "@/components/sections/DisclaimerBanner";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tWhy, tDisclaimer] = await Promise.all([
    getTranslations("about"),
    getTranslations("whyChoose"),
    getTranslations("disclaimer"),
  ]);

  return (
    <>
      <PageHero
        title={t("title")}
        description={t("description")}
      />
      <WhyChooseSection
        showCta={false}
        title={tWhy("title")}
        subtitle={tWhy("subtitle")}
        bullets={[
          { title: tWhy("fastTitle"), text: tWhy("fastText") },
          { title: tWhy("expertTitle"), text: tWhy("expertText") },
          { title: tWhy("transparentTitle"), text: tWhy("transparentText") },
        ]}
        iconLabels={[tWhy("dedicated"), tWhy("fastService"), tWhy("expertTeam"), tWhy("proResults")]}
      />
      <DisclaimerBanner text={tDisclaimer("text")} />
    </>
  );
}

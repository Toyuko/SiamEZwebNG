import { setRequestLocale } from "next-intl/server";
import { HeroSection } from "@/components/sections/HeroSection";
import { StatsBar } from "@/components/sections/StatsBar";
import { DisclaimerBanner } from "@/components/sections/DisclaimerBanner";
import { ServiceGrid } from "@/components/sections/ServiceGrid";
import { WhyChooseSection } from "@/components/sections/WhyChooseSection";
import { CTASection } from "@/components/sections/CTASection";
import { getServicesList } from "@/data-access/service";
import { getTranslations } from "next-intl/server";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [services, t, tCommon, tHero, tSite, tWhy, tDisclaimer] = await Promise.all([
    getServicesList().catch(() => []),
    getTranslations("home"),
    getTranslations("common"),
    getTranslations("hero"),
    getTranslations("site"),
    getTranslations("whyChoose"),
    getTranslations("disclaimer"),
  ]);
  const displayServices = services.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    shortDescription: s.shortDescription,
    description: s.description,
  }));

  return (
    <>
      <HeroSection
        badge={tHero("badge")}
        headline={tHero("headline")}
        subline={tHero("subline")}
        primaryCta={{ label: tCommon("getStarted"), href: "/contact" }}
        secondaryCta={{ label: tCommon("learnMore"), href: "/services" }}
      />
      <StatsBar
        labels={{
          happyClients: tSite("happyClients"),
          yearsExperience: tSite("yearsExperience"),
          successRate: tSite("successRate"),
        }}
      />
      <DisclaimerBanner text={tDisclaimer("text")} />
      <ServiceGrid
        services={displayServices}
        title={t("servicesTitle")}
        subtitle={t("servicesSubtitle")}
        maxItems={9}
        showViewAll={true}
        viewAllHref="/services"
        viewAllLabel={tCommon("viewAllServices")}
        learnMoreLabel={tCommon("learnMoreLink")}
      />
      <WhyChooseSection
        title={tWhy("title")}
        subtitle={tWhy("subtitle")}
        bullets={[
          { title: tWhy("fastTitle"), text: tWhy("fastText") },
          { title: tWhy("expertTitle"), text: tWhy("expertText") },
          { title: tWhy("transparentTitle"), text: tWhy("transparentText") },
        ]}
        iconLabels={[tWhy("dedicated"), tWhy("fastService"), tWhy("expertTeam"), tWhy("proResults")]}
        ctaLabel={tCommon("aboutUs")}
      />
      <CTASection
        title={t("ctaTitle")}
        subtitle={t("ctaSubtitle")}
        primaryLabel={tCommon("contactUs")}
        primaryHref="/contact"
        secondaryLabel={tCommon("viewServices")}
        secondaryHref="/services"
      />
    </>
  );
}

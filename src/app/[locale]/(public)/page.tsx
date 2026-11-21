import { setRequestLocale } from "next-intl/server";
import { HeroSection } from "@/components/sections/HeroSection";
import {
  HomeGoalsSection,
  mapFeaturedProperty,
  mapFeaturedVehicle,
} from "@/components/sections/HomeGoalsSection";
import { StatsBar } from "@/components/sections/StatsBar";
import { DisclaimerBanner } from "@/components/sections/DisclaimerBanner";
import { ServiceGrid } from "@/components/sections/ServiceGrid";
import { WhyChooseSection } from "@/components/sections/WhyChooseSection";
import { CTASection } from "@/components/sections/CTASection";
import { getPublicServicesList } from "@/data-access/service";
import { listActiveLifeEvents } from "@/data-access/life-events";
import { getPublicFeaturedBoostedSalesVehicles } from "@/data-access/sales";
import { getPublicFeaturedBoostedSalesProperties } from "@/data-access/real-estate";
import { serviceSlugs } from "@/config/services";
import { getTranslations } from "next-intl/server";
import { softLaunch } from "@/config/soft-launch";
import { site } from "@/config/site";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { CoverageSection } from "@/components/seo/CoverageSection";
import { breadcrumbListJsonLd, webPageJsonLd } from "@/lib/seo/jsonld";
import { canonicalUrl } from "@/lib/seo/urls";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  return buildPageMetadata({
    locale,
    path: "",
    title: t("metaTitle"),
    description: t("metaDescription"),
    keywords: [
      "SiamEZ",
      "Thailand services",
      "services for foreigners in Thailand",
      "Thai driver's license",
      "marriage registration Thailand",
    ],
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale === "th" ? "th" : "en";
  // Avoid auth() on the homepage: it forces dynamic rendering and duplicates the
  // session read already done in PublicHeaderWithAuth. Portal middleware handles login.
  const goalsHref = "/portal/goals";
  const whatsappHref = `https://wa.me/${site.phone.replace(/\D/g, "")}`;

  const [
    services,
    lifeEvents,
    featuredVehicles,
    featuredProperties,
    t,
    tCommon,
    tHero,
    tSite,
    tWhy,
    tDisclaimer,
    tServices,
    tSeo,
  ] = await Promise.all([
    getPublicServicesList().catch(() => []),
    listActiveLifeEvents().catch(() => []),
    getPublicFeaturedBoostedSalesVehicles().catch(() => []),
    getPublicFeaturedBoostedSalesProperties().catch(() => []),
    getTranslations("home"),
    getTranslations("common"),
    getTranslations("hero"),
    getTranslations("site"),
    getTranslations("whyChoose"),
    getTranslations("disclaimer"),
    getTranslations("services"),
    getTranslations("seo"),
  ]);

  const displayServices = services.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    shortDescription: s.shortDescription,
    description: s.description,
    priceAmount: s.priceAmount,
    priceCurrency: s.priceCurrency,
  }));

  const popularGoals = [
    {
      id: "moving",
      label: t("goalsSection.prompts.moving"),
      prompt: t("goalsSection.prompts.moving"),
      href: "/portal/goals?event=moving-to-thailand",
    },
    {
      id: "license",
      label: t("goalsSection.prompts.license"),
      prompt: t("goalsSection.prompts.license"),
    },
    {
      id: "vehicle",
      label: t("goalsSection.prompts.vehicle"),
      prompt: t("goalsSection.prompts.vehicle"),
    },
    {
      id: "property",
      label: t("goalsSection.prompts.property"),
      prompt: t("goalsSection.prompts.property"),
    },
  ];

  const lifeEventTeasers = lifeEvents.map((event) => ({
    id: event.id,
    key: event.key,
    title: loc === "th" && event.titleTh ? event.titleTh : event.titleEn,
    description:
      loc === "th" && event.descriptionTh
        ? event.descriptionTh
        : event.descriptionEn,
    stepCount: event.steps.length,
  }));

  const featuredListings = [
    ...featuredVehicles.map(mapFeaturedVehicle),
    ...featuredProperties.map(mapFeaturedProperty),
  ];

  return (
    <>
      <JsonLdScript
        data={[
          webPageJsonLd({
            url: canonicalUrl(locale, ""),
            name: t("metaTitle"),
            description: t("metaDescription"),
            locale,
          }),
          breadcrumbListJsonLd([{ name: tCommon("home"), url: canonicalUrl(locale, "") }]),
        ]}
      />
      <HeroSection
        badge={tHero("badge")}
        headline={tHero("headline")}
        subline={tHero("subline")}
        primaryCta={{
          label: tHero("primaryCta"),
          href: "/services",
        }}
        secondaryCta={{
          label: tHero("whatsappCta"),
          href: whatsappHref,
          external: true,
        }}
        askCta={{
          label: tHero("askCta"),
          prompt: t("goalsSection.conciergePrompt"),
        }}
      />
      <HomeGoalsSection
        labels={{
          title: t("goalsSection.title"),
          subtitle: t("goalsSection.subtitle"),
          popularGoals: t("goalsSection.popularGoals"),
          lifeEvents: t("goalsSection.lifeEvents"),
          marketplace: t("goalsSection.marketplace"),
          viewAllGoals: t("goalsSection.viewAllGoals"),
          viewJourney: t("goalsSection.viewJourney"),
          viewAllVehicles: t("goalsSection.viewAllVehicles"),
          viewAllProperties: t("goalsSection.viewAllProperties"),
          conciergeLabel: t("goalsSection.conciergeLabel"),
          conciergeHint: t("goalsSection.conciergeHint"),
          conciergePrompt: t("goalsSection.conciergePrompt"),
          stepsLabel: t("goalsSection.stepsLabel"),
        }}
        popularGoals={popularGoals}
        lifeEvents={softLaunch.enabled && !softLaunch.showLifeEvents ? [] : lifeEventTeasers}
        featuredListings={featuredListings}
        isLoggedIn={false}
        goalsHref={goalsHref}
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
        maxItems={serviceSlugs.length}
        showViewAll={true}
        viewAllHref="/services"
        viewAllLabel={tCommon("viewAllServices")}
        getBookHref={(slug) => `/book/${slug}`}
        bookNowLabel={tServices("bookNow")}
        detailsLabel={tServices("details")}
        priceLabel={tServices("from")}
      />
      <CoverageSection
        title={tSeo("coverageTitle")}
        body={tSeo("coverageBody")}
        officeLabel={tSeo("officeLabel")}
        servicesLabel={tCommon("viewServices")}
        contactLabel={tCommon("contactUs")}
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
        primaryLabel={tHero("primaryCta")}
        primaryHref="/services"
        secondaryLabel={tHero("whatsappCta")}
        secondaryHref={whatsappHref}
        secondaryExternal
      />
    </>
  );
}

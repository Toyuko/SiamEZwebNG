import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import {
  PremiumHero,
  TrustBar,
  ServiceCategoryGrid,
  WhyChooseStrip,
  FeaturedServicesRow,
  BookingPromoPanel,
  TrackBookingPanel,
  HomeTestimonials,
  MobileBookBar,
} from "@/components/home";
import { DisclaimerBanner } from "@/components/sections/DisclaimerBanner";
import { CoverageSection } from "@/components/seo/CoverageSection";
import { getPublicServicesList } from "@/data-access/service";
import { popularServiceSlugs, getServiceCatalogEntry } from "@/config/service-catalog";
import { site } from "@/config/site";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { breadcrumbListJsonLd, webPageJsonLd } from "@/lib/seo/jsonld";
import { canonicalUrl } from "@/lib/seo/urls";
import { GOOGLE_BUSINESS_REVIEWS } from "@/content/google-testimonials";
import { homeCategoryTiles } from "@/config/home-categories";

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

  // Avoid auth() on the homepage: it forces dynamic rendering.
  const [
    services,
    t,
    tCommon,
    tHero,
    tWhy,
    tDisclaimer,
    tServices,
    tSeo,
    tTestimonials,
  ] = await Promise.all([
    getPublicServicesList().catch(() => []),
    getTranslations("home"),
    getTranslations("common"),
    getTranslations("hero"),
    getTranslations("whyChoose"),
    getTranslations("disclaimer"),
    getTranslations("services"),
    getTranslations("seo"),
    getTranslations("testimonials"),
  ]);

  const widgetServices = services.map((s) => ({
    slug: s.slug,
    name: s.name,
  }));

  const featuredWithImages = popularServiceSlugs
    .map((slug) => {
      const fromDb = services.find((s) => s.slug === slug);
      const catalog = getServiceCatalogEntry(slug);
      if (!fromDb && !catalog) return null;
      return {
        slug,
        name: fromDb?.name ?? catalog!.name[loc],
        description:
          fromDb?.shortDescription ?? catalog!.shortDescription[loc] ?? "",
        thumbnailImage: catalog?.thumbnailImage ?? null,
        priceAmount: fromDb?.priceAmount ?? null,
        priceCurrency: fromDb?.priceCurrency ?? "THB",
      };
    })
    .filter((s): s is NonNullable<typeof s> => s != null)
    .slice(0, 4);

  const categoryLabels = Object.fromEntries(
    homeCategoryTiles.map((tile) => [tile.labelKey, t(`categories.${tile.labelKey}`)])
  );

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

      <PremiumHero
        headlineBefore={tHero("headlineBefore")}
        headlineHighlight={tHero("headlineHighlight")}
        headlineAfter={tHero("headlineAfter")}
        subline={tHero("subline")}
        trustItems={[
          tHero("trust1"),
          tHero("trust2"),
          tHero("trust3"),
          tHero("trust4"),
        ]}
        primaryCta={{
          label: tHero("primaryCta"),
          href: "/services",
        }}
        secondaryCta={{
          label: tHero("lineCta"),
          href: site.lineUrl,
          external: true,
        }}
        booking={{
          title: t("bookingWidget.title"),
          subtitle: t("bookingWidget.subtitle"),
          selectLabel: t("bookingWidget.selectLabel"),
          selectPlaceholder: t("bookingWidget.selectPlaceholder"),
          continueLabel: t("bookingWidget.continue"),
          steps: [
            t("bookingWidget.step1"),
            t("bookingWidget.step2"),
            t("bookingWidget.step3"),
          ],
          trustLabels: [
            t("bookingWidget.trustQuick"),
            t("bookingWidget.trustSecure"),
            t("bookingWidget.trustConfirm"),
          ],
        }}
        services={widgetServices}
      />

      <TrustBar
        items={[
          [t("trustBar.easyTitle"), t("trustBar.easyText")],
          [t("trustBar.localTitle"), t("trustBar.localText")],
          [t("trustBar.trustedTitle"), t("trustBar.trustedText")],
          [t("trustBar.supportTitle"), t("trustBar.supportText")],
        ]}
      />

      <DisclaimerBanner text={tDisclaimer("text")} />

      <ServiceCategoryGrid
        title={t("servicesTitle")}
        subtitle={t("servicesSubtitle")}
        viewAllLabel={tCommon("viewAllServices")}
        labels={categoryLabels}
      />

      <WhyChooseStrip
        title={tWhy("title")}
        subtitle={tWhy("subtitle")}
        items={[
          { title: tWhy("easyOnlineTitle"), text: tWhy("easyOnlineText") },
          { title: tWhy("trustedProsTitle"), text: tWhy("trustedProsText") },
          { title: tWhy("multilingualTitle"), text: tWhy("multilingualText") },
          { title: tWhy("localKnowledgeTitle"), text: tWhy("localKnowledgeText") },
        ]}
      />

      <section className="bg-siam-surface/40 py-12 sm:py-14">
        <div className="container mx-auto grid gap-8 px-4 lg:grid-cols-[1.4fr_0.9fr]">
          <FeaturedServicesRow
            title={t("featuredTitle")}
            subtitle={t("featuredSubtitle")}
            viewAllLabel={tCommon("viewAllServices")}
            learnMoreLabel={tCommon("learnMoreLink")}
            bookNowLabel={tServices("bookNow")}
            fromLabel={tServices("from")}
            services={featuredWithImages}
          />
          <div className="flex flex-col gap-4">
            <BookingPromoPanel
              title={t("promo.title")}
              text={t("promo.text")}
              ctaLabel={t("promo.cta")}
              features={[
                t("bookingWidget.trustQuick"),
                t("bookingWidget.trustSecure"),
                t("bookingWidget.trustConfirm"),
              ]}
            />
            <TrackBookingPanel
              title={t("track.title")}
              text={t("track.text")}
              ctaLabel={t("track.cta")}
            />
          </div>
        </div>
      </section>

      <HomeTestimonials
        title={tTestimonials("title")}
        viewAllLabel={tCommon("learnMoreLink")}
        reviews={GOOGLE_BUSINESS_REVIEWS}
      />

      <CoverageSection
        title={tSeo("coverageTitle")}
        body={tSeo("coverageBody")}
        officeLabel={tSeo("officeLabel")}
        servicesLabel={tCommon("viewServices")}
        contactLabel={tCommon("contactUs")}
      />

      <div className="h-16 md:hidden" aria-hidden />
      <MobileBookBar label={tHero("primaryCta")} />
    </>
  );
}

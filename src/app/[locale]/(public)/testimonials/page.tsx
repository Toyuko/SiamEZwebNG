import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/sections/PageHero";
import { TestimonialsClientSection } from "@/components/testimonials/TestimonialsClientSection";
import { GOOGLE_BUSINESS_REVIEWS } from "@/content/google-testimonials";
import { SOCIAL_TESTIMONIALS } from "@/content/social-testimonials";
import {
  googleReviewToDisplay,
  socialToDisplay,
  type DisplayTestimonial,
} from "@/lib/testimonial-display";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "testimonials" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function TestimonialsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("testimonials");

  const stats = [
    { value: t("stats.averageRating"), label: t("stats.averageRatingLabel") },
    { value: t("stats.happyClients"), label: t("stats.happyClientsLabel") },
    { value: t("stats.satisfactionRate"), label: t("stats.satisfactionRateLabel") },
    { value: t("stats.reviews"), label: t("stats.reviewsLabel") },
  ];

  const legacyTestimonials: DisplayTestimonial[] = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
    id: `site-${n}`,
    platform: "google",
    service: t(`testimonial${n}.service`),
    quote: t(`testimonial${n}.quote`),
    author: t(`testimonial${n}.author`),
    role: t(`testimonial${n}.role`),
    initials: t(`testimonial${n}.initials`),
    stars: n === 3 || n === 8 ? 4 : 5,
  }));

  const googleUgcDisplay = GOOGLE_BUSINESS_REVIEWS.map((item) =>
    googleReviewToDisplay(item, t("reviewerRole.google"))
  );

  const socialDisplay = SOCIAL_TESTIMONIALS.map((item) =>
    socialToDisplay(
      item,
      item.platform === "youtube" ? t("reviewerRole.youtube") : t("reviewerRole.facebook")
    )
  );

  const testimonials: DisplayTestimonial[] = [
    ...legacyTestimonials,
    ...googleUgcDisplay,
    ...socialDisplay,
  ];

  const sectionLabels = {
    filterAriaLabel: t("filterAriaLabel"),
    filters: {
      all: t("filters.all"),
      google: t("filters.google"),
      facebook: t("filters.facebook"),
      youtube: t("filters.youtube"),
    },
    platformNames: {
      google: t("platform.google"),
      facebook: t("platform.facebook"),
      youtube: t("platform.youtube"),
    },
    watchVideoReview: t("watchVideoReview"),
    emptyCategory: t("emptyCategory"),
  };

  return (
    <>
      <PageHero
        title={t("title")}
        description={t("description")}
      />
      {/* Stats Section */}
      <section className="border-y border-siam-blue-light/30 bg-siam-blue-dark/50">
        <div className="container mx-auto px-4 py-8 sm:py-10">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="text-center opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${0.15 * (i + 1)}s` }}
              >
                <p className="text-2xl font-bold text-white sm:text-3xl md:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-white/80 sm:text-sm">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container mx-auto px-4 py-12 sm:py-16">
        <h2 className="mb-8 text-center text-2xl font-bold text-foreground sm:text-3xl">
          {t("sectionTitle")}
        </h2>
        <TestimonialsClientSection
          testimonials={testimonials}
          labels={sectionLabels}
        />
      </section>
    </>
  );
}

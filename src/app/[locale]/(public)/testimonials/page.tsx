import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/sections/PageHero";
import { Card, CardContent } from "@/components/ui/card";

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

  const testimonials = [
    {
      service: t("testimonial1.service"),
      quote: t("testimonial1.quote"),
      author: t("testimonial1.author"),
      role: t("testimonial1.role"),
      initials: t("testimonial1.initials"),
      stars: 5,
    },
    {
      service: t("testimonial2.service"),
      quote: t("testimonial2.quote"),
      author: t("testimonial2.author"),
      role: t("testimonial2.role"),
      initials: t("testimonial2.initials"),
      stars: 5,
    },
    {
      service: t("testimonial3.service"),
      quote: t("testimonial3.quote"),
      author: t("testimonial3.author"),
      role: t("testimonial3.role"),
      initials: t("testimonial3.initials"),
      stars: 4,
    },
    {
      service: t("testimonial4.service"),
      quote: t("testimonial4.quote"),
      author: t("testimonial4.author"),
      role: t("testimonial4.role"),
      initials: t("testimonial4.initials"),
      stars: 5,
    },
    {
      service: t("testimonial5.service"),
      quote: t("testimonial5.quote"),
      author: t("testimonial5.author"),
      role: t("testimonial5.role"),
      initials: t("testimonial5.initials"),
      stars: 5,
    },
    {
      service: t("testimonial6.service"),
      quote: t("testimonial6.quote"),
      author: t("testimonial6.author"),
      role: t("testimonial6.role"),
      initials: t("testimonial6.initials"),
      stars: 5,
    },
    {
      service: t("testimonial7.service"),
      quote: t("testimonial7.quote"),
      author: t("testimonial7.author"),
      role: t("testimonial7.role"),
      initials: t("testimonial7.initials"),
      stars: 5,
    },
    {
      service: t("testimonial8.service"),
      quote: t("testimonial8.quote"),
      author: t("testimonial8.author"),
      role: t("testimonial8.role"),
      initials: t("testimonial8.initials"),
      stars: 4,
    },
    {
      service: t("testimonial9.service"),
      quote: t("testimonial9.quote"),
      author: t("testimonial9.author"),
      role: t("testimonial9.role"),
      initials: t("testimonial9.initials"),
      stars: 5,
    },
  ];

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
      {/* Testimonials Section */}
      <section className="container mx-auto px-4 py-12 sm:py-16">
        <h2 className="mb-8 text-center text-2xl font-bold text-foreground sm:text-3xl">
          {t("sectionTitle")}
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, i) => (
            <Card key={i} className="border-border shadow-sm">
              <CardContent className="p-6">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-siam-blue">
                  {testimonial.service}
                </div>
                <div className="flex gap-1 text-siam-yellow">
                  {"★".repeat(testimonial.stars)}
                  {testimonial.stars < 5 && "☆".repeat(5 - testimonial.stars)}
                </div>
                <blockquote className="mt-4 text-foreground">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-siam-blue text-sm font-semibold text-white">
                    {testimonial.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}

import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/sections/PageHero";
import { WhyChooseSection } from "@/components/sections/WhyChooseSection";
import { DisclaimerBanner } from "@/components/sections/DisclaimerBanner";
import { CoverageSection } from "@/components/seo/CoverageSection";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { Link } from "@/i18n/navigation";
import { site } from "@/config/site";
import { serviceDisplayNames, serviceSlugs } from "@/config/services";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return buildPageMetadata({
    locale,
    path: "/about",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tWhy, tDisclaimer, tSeo, tCommon] = await Promise.all([
    getTranslations("about"),
    getTranslations("whyChoose"),
    getTranslations("disclaimer"),
    getTranslations("seo"),
    getTranslations("common"),
  ]);

  return (
    <>
      <PageHero
        title={t("title")}
        description={t("description")}
      />
      <section className="container mx-auto max-w-4xl px-4 py-12 sm:py-16">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("whatWeDoTitle")}</h2>
        <p className="mt-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">{t("whatWeDoBody")}</p>
        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {serviceSlugs.map((slug) => (
            <li key={slug}>
              <Link href={`/services/${slug}`} className="text-siam-blue hover:underline">
                {serviceDisplayNames[slug]}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-gray-600 dark:text-gray-400">
          {site.legal.companyName}
          <br />
          {site.address.full}
          <br />
          {site.email} · {site.phone} · LINE {site.line}
        </p>
      </section>
      <CoverageSection
        title={tSeo("coverageTitle")}
        body={tSeo("coverageBody")}
        officeLabel={tSeo("officeLabel")}
        servicesLabel={tCommon("viewServices")}
        contactLabel={tCommon("contactUs")}
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

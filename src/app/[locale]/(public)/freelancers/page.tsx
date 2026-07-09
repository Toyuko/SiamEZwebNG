import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { listPublicFreelancers } from "@/data-access/freelancer";
import { FreelancerDirectoryClient } from "./FreelancerDirectoryClient";
import { site } from "@/config/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "freelancersPublic" });
  const baseUrl = site.url.replace(/\/$/, "");

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `${baseUrl}/${locale}/freelancers`,
      languages: {
        en: `${baseUrl}/en/freelancers`,
        th: `${baseUrl}/th/freelancers`,
      },
    },
    openGraph: {
      title: `${t("metaTitle")} | ${site.name}`,
      description: t("metaDescription"),
      url: `${baseUrl}/${locale}/freelancers`,
      siteName: site.name,
      locale: locale === "th" ? "th_TH" : "en_US",
      type: "website",
    },
  };
}

export default async function FreelancersDirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; skill?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("freelancersPublic");

  const q = sp.q?.trim() ?? "";
  const skill = sp.skill?.trim() ?? "";
  const { items, total } = await listPublicFreelancers({
    q: q || undefined,
    skill: skill || undefined,
    page: 1,
    pageSize: 24,
  });

  return (
    <div className="container mx-auto px-4 py-12 sm:py-16">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 text-base text-gray-600 dark:text-gray-400 sm:text-lg">
          {t("subtitle")}
        </p>
      </div>
      <FreelancerDirectoryClient
        initialItems={items}
        initialTotal={total}
        initialQ={q}
        initialSkill={skill}
      />
    </div>
  );
}

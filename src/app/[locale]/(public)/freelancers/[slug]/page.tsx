import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getPublicFreelancerBySlug } from "@/data-access/freelancer";
import { FreelancerPublicProfileClient } from "./FreelancerPublicProfileClient";
import { site } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { canonicalUrl, languageAlternates } from "@/lib/seo/urls";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const profile = await getPublicFreelancerBySlug(slug);
  const t = await getTranslations({ locale, namespace: "freelancersPublic" });

  if (!profile) {
    return { title: t("notFoundTitle") };
  }

  const name = profile.user.name ?? profile.slug;
  const title = profile.title
    ? `${name} — ${profile.title}`
    : t("profileMetaTitle", { name });
  const description =
    profile.bio?.slice(0, 160) ||
    t("profileMetaDescription", { name, title: profile.title ?? t("freelancerBadge") });
  const path = `/freelancers/${profile.slug}`;
  const url = canonicalUrl(locale, path);

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: languageAlternates(path),
    },
    openGraph: {
      title: `${title} | ${site.name}`,
      description,
      url,
      siteName: site.name,
      locale: locale === "th" ? "th_TH" : "en_US",
      type: "profile",
      ...(profile.user.image ? { images: [{ url: profile.user.image }] } : {}),
    },
  };
}

export default async function FreelancerPublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("freelancersPublic");

  const profile = await getPublicFreelancerBySlug(slug);
  if (!profile) notFound();

  return (
    <div className="container mx-auto px-4 py-10 sm:py-14">
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/freelancers" className="hover:text-siam-blue hover:underline">
          {t("title")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700 dark:text-gray-300">
          {profile.user.name ?? profile.slug}
        </span>
      </nav>
      <FreelancerPublicProfileClient
        profile={{
          slug: profile.slug,
          title: profile.title,
          bio: profile.bio,
          skills: profile.skills,
          hourlyRate: profile.hourlyRate,
          averageRating: profile.averageRating,
          totalReviews: profile.totalReviews,
          verificationStatus: profile.verificationStatus,
          isSpecialMember: profile.isSpecialMember,
          services: profile.services,
          user: profile.user,
        }}
      />
    </div>
  );
}

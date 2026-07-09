import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getFreelancerProfileByUserId, ensureFreelancerProfile } from "@/data-access/freelancer";
import { parseFreelancerServices } from "@/lib/freelancer-profile";
import { prisma } from "@/lib/db";
import { FreelancerProfileForm } from "./FreelancerProfileForm";
import { Link } from "@/i18n/navigation";

export default async function FreelancerProfileSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAuth();
  const t = await getTranslations("freelancerProfile");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, role: true, active: true },
  });

  if (!user?.active || (user.role !== "customer" && user.role !== "freelancer")) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t("roleNotAllowed")}</p>
        <Link href="/portal" className="mt-4 inline-block text-siam-blue hover:underline">
          {t("backToPortal")}
        </Link>
      </div>
    );
  }

  await ensureFreelancerProfile(user.id);
  const profile = await getFreelancerProfileByUserId(user.id);

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">{t("subtitle")}</p>
      </div>
      <FreelancerProfileForm
        userName={user.name}
        initial={
          profile
            ? {
                slug: profile.slug,
                isPublic: profile.isPublic,
                title: profile.title,
                bio: profile.bio,
                skills: profile.skills,
                hourlyRate: profile.hourlyRate,
                services: parseFreelancerServices(profile.services),
                verificationStatus: profile.verificationStatus,
              }
            : null
        }
      />
    </div>
  );
}

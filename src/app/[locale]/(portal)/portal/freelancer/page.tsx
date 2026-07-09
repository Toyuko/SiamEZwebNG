import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { requireFreelancer } from "@/lib/auth";
import {
  getOpenJobsForFeed,
  getActiveJobsByFreelancerId,
  getFreelancerRevenueStats,
} from "@/data-access/job";
import { getFreelancerProfileByUserId } from "@/data-access/freelancer";
import { FreelancerJobFeed } from "@/components/FreelancerJobFeed";
import { serializeJobBoardFeedItem } from "@/lib/jobs/job-board-payload";
import { RevenueTracker } from "@/components/freelancer/RevenueTracker";
import { ActiveJobsTrack } from "@/components/freelancer/ActiveJobsTrack";
import { SubscriptionCard } from "@/components/freelancer/SubscriptionCard";
import { PortalFooter } from "@/components/portal/PortalFooter";
import { SponsoredAdBanner } from "@/components/company/SponsoredAdBanner";

export default async function FreelancerPortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireFreelancer();
  const t = await getTranslations("freelancer");

  const [openJobs, activeJobs, revenue, profile] = await Promise.all([
    getOpenJobsForFeed(session.user.id),
    getActiveJobsByFreelancerId(session.user.id),
    getFreelancerRevenueStats(session.user.id),
    getFreelancerProfileByUserId(session.user.id),
  ]);

  const currency = "THB";
  const verificationLabel =
    profile?.verificationStatus === "verified"
      ? t("verified")
      : profile?.verificationStatus === "rejected"
        ? t("verificationRejected")
        : t("verificationPending");

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t("dashboardTitle")}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{t("dashboardSubtitle")}</p>
          </div>
          <div className="rounded-full bg-siam-blue/10 px-4 py-2 text-sm font-medium text-siam-blue">
            {verificationLabel}
            {profile && profile.totalReviews > 0 && (
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                · ⭐ {profile.averageRating.toFixed(1)} ({profile.totalReviews}{" "}
                {profile.totalReviews === 1 ? "review" : "reviews"})
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueTracker
            totalEarned={revenue.totalEarned}
            pendingClearance={revenue.pendingClearance}
            currency={currency}
          />
        </div>
        <SubscriptionCard />
      </div>

      <SponsoredAdBanner className="mb-6 block overflow-hidden" />

      <div className="grid gap-6 lg:grid-cols-2">
        <FreelancerJobFeed
          initialJobs={openJobs.map(serializeJobBoardFeedItem)}
          isSpecialMember={
            profile?.isSpecialMember === true &&
            profile.verificationStatus === "verified"
          }
        />
        <ActiveJobsTrack jobs={activeJobs} />
      </div>

      <PortalFooter />
    </div>
  );
}

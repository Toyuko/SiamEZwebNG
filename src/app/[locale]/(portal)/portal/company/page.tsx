import { setRequestLocale } from "next-intl/server";
import { requireCompany } from "@/lib/auth";
import {
  getCompanyDashboardByUserId,
  getCompanyStats,
} from "@/data-access/company";
import { CompanyDashboardClient } from "@/components/company/CompanyDashboardClient";
import { PortalFooter } from "@/components/portal/PortalFooter";
import { redirect } from "next/navigation";

export default async function CompanyPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const session = await requireCompany();

  const company = await getCompanyDashboardByUserId(session.user.id);
  if (!company) {
    redirect(`/${locale}/portal`);
  }

  const stats = await getCompanyStats(company.id);

  const tabParam = sp.tab;
  const initialTab =
    tabParam === "jobs" || tabParam === "ads" || tabParam === "overview"
      ? tabParam
      : "overview";

  return (
    <div>
      <CompanyDashboardClient
        company={{
          id: company.id,
          slug: company.slug,
          companyName: company.companyName,
          logo: company.logo,
          bannerImage: company.bannerImage,
          website: company.website,
          description: company.description,
          industry: company.industry,
          companySize: company.companySize,
          taxId: company.taxId,
          address: company.address,
          isVerified: company.isVerified,
          jobPostings: company.jobPostings.map((job) => ({
            id: job.id,
            title: job.title,
            description: job.description,
            budget: job.budget,
            currency: job.currency,
            requiredSkills: job.requiredSkills,
            status: job.status,
            applications: job.applications.map((app) => ({
              id: app.id,
              status: app.status,
              coverNote: app.coverNote,
              freelancer: {
                id: app.freelancer.id,
                name: app.freelancer.name,
                email: app.freelancer.email,
                image: app.freelancer.image,
                freelancerProfile: app.freelancer.freelancerProfile,
              },
            })),
          })),
          adCampaigns: company.adCampaigns.map((ad) => ({
            id: ad.id,
            title: ad.title,
            imageUrl: ad.imageUrl,
            targetUrl: ad.targetUrl,
            budget: ad.budget,
            dailyLimit: ad.dailyLimit,
            impressions: ad.impressions,
            clicks: ad.clicks,
            status: ad.status,
          })),
        }}
        stats={stats}
        initialTab={initialTab}
      />
      <PortalFooter />
    </div>
  );
}

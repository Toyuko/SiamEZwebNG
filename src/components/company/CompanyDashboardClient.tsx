"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BadgeCheck, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  createAdCampaign,
  createJobPosting,
  respondToJobApplication,
  updateAdCampaignStatus,
  updateCompanyProfile,
  updateJobPostingStatus,
} from "@/actions/company";

type Applicant = {
  id: string;
  status: "PENDING" | "HIRED" | "DECLINED";
  coverNote: string | null;
  freelancer: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    freelancerProfile: {
      averageRating: number;
      totalReviews: number;
      verificationStatus: string;
      skills: string[];
    } | null;
  };
};

type JobPosting = {
  id: string;
  title: string;
  description: string;
  budget: number;
  currency: string;
  requiredSkills: string[];
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CLOSED";
  applications: Applicant[];
};

type AdCampaign = {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  budget: number;
  dailyLimit: number | null;
  impressions: number;
  clicks: number;
  status: "PENDING" | "ACTIVE" | "PAUSED";
};

type CompanyData = {
  id: string;
  slug: string;
  companyName: string;
  logo: string | null;
  bannerImage: string | null;
  website: string | null;
  description: string | null;
  industry: string | null;
  companySize: string | null;
  taxId: string | null;
  address: string | null;
  isVerified: boolean;
  jobPostings: JobPosting[];
  adCampaigns: AdCampaign[];
};

type Stats = {
  activeJobs: number;
  totalSpent: number;
  impressions: number;
  clicks: number;
  ctr: number;
};

type Tab = "overview" | "jobs" | "ads";

function satangToThb(satang: number) {
  return satang / 100;
}

function formatThb(satang: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(satangToThb(satang));
}

export function CompanyDashboardClient({
  company,
  stats,
  initialTab = "overview",
}: {
  company: CompanyData;
  stats: Stats;
  initialTab?: Tab;
}) {
  const t = useTranslations("company");
  const [tab, setTab] = useState<Tab>(initialTab);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(
    company.jobPostings[0]?.id ?? null
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const tabs = useMemo(
    () =>
      [
        { id: "overview" as const, label: t("tabOverview") },
        { id: "jobs" as const, label: t("tabJobs") },
        { id: "ads" as const, label: t("tabAds") },
      ] as const,
    [t]
  );

  function runAction(action: () => Promise<{ ok?: true; error?: unknown }>, successMsg?: string) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result && "error" in result && result.error) {
        setError(typeof result.error === "string" ? result.error : t("errorGeneric"));
        return;
      }
      if (successMsg) setMessage(successMsg);
    });
  }

  function onProfileSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    runAction(() => updateCompanyProfile(null, formData), t("savedProfile"));
  }

  function onJobSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    runAction(async () => {
      const result = await createJobPosting(null, formData);
      if (result.ok) form.reset();
      return result;
    });
  }

  function onAdSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    runAction(async () => {
      const result = await createAdCampaign(null, formData);
      if (result.ok) form.reset();
      return result;
    });
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("dashboardTitle")}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{t("dashboardSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium",
              company.isVerified
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-siam-blue/10 text-siam-blue"
            )}
          >
            {company.isVerified ? (
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="h-4 w-4" />
                {t("verifiedBusiness")}
              </span>
            ) : (
              t("verificationPending")
            )}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/companies/${company.slug}`}>
              {t("viewPublicProfile")}
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {(message || error) && (
        <div
          className={cn(
            "mb-6 rounded-lg px-4 py-3 text-sm",
            message
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
          )}
        >
          {message || error}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: t("statsActiveJobs"), value: String(stats.activeJobs) },
          { label: t("statsTotalSpent"), value: formatThb(stats.totalSpent) },
          { label: t("statsAdImpressions"), value: String(stats.impressions) },
          { label: t("statsAdClicks"), value: String(stats.clicks) },
          { label: t("statsCtr"), value: `${stats.ctr.toFixed(1)}%` },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div
        className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800"
        role="tablist"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === item.id
                ? "border-siam-blue text-siam-blue"
                : "border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("profileTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onProfileSubmit} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">{t("companyName")}</label>
                <Input name="companyName" defaultValue={company.companyName} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("slug")}</label>
                <Input name="slug" defaultValue={company.slug} required />
                <p className="mt-1 text-xs text-gray-500">{t("slugHint")}</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("logoUrl")}</label>
                <Input name="logo" defaultValue={company.logo ?? ""} placeholder="https://" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("bannerUrl")}</label>
                <Input
                  name="bannerImage"
                  defaultValue={company.bannerImage ?? ""}
                  placeholder="https://"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("website")}</label>
                <Input name="website" defaultValue={company.website ?? ""} placeholder="https://" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("industry")}</label>
                <Input name="industry" defaultValue={company.industry ?? ""} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("companySize")}</label>
                <Input name="companySize" defaultValue={company.companySize ?? ""} placeholder="11-50" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("taxId")}</label>
                <Input name="taxId" defaultValue={company.taxId ?? ""} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">{t("address")}</label>
                <Input name="address" defaultValue={company.address ?? ""} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">{t("description")}</label>
                <textarea
                  name="description"
                  defaultValue={company.description ?? ""}
                  rows={5}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={pending}>
                  {pending ? t("saving") : t("saveProfile")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === "jobs" && (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("postJobTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onJobSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("jobTitle")}</label>
                  <Input name="title" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("jobDescription")}</label>
                  <textarea
                    name="description"
                    required
                    rows={4}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("jobBudget")}</label>
                  <Input name="budgetThb" type="number" min={1} step={1} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("jobSkills")}</label>
                  <Input name="requiredSkills" placeholder="Translation, Visa, Thai" />
                </div>
                <Button type="submit" disabled={pending}>
                  {t("createJob")}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4 lg:col-span-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("activeJobs")}
            </h2>
            {company.jobPostings.length === 0 ? (
              <p className="text-sm text-gray-500">{t("noJobs")}</p>
            ) : (
              company.jobPostings.map((job) => {
                const open = expandedJobId === job.id;
                return (
                  <Card key={job.id}>
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 p-5 text-left"
                      onClick={() => setExpandedJobId(open ? null : job.id)}
                    >
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{job.title}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          {formatThb(job.budget)} · {job.status} · {job.applications.length}{" "}
                          {t("applicants").toLowerCase()}
                        </p>
                      </div>
                      {open ? (
                        <ChevronUp className="h-5 w-5 shrink-0 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 shrink-0 text-gray-400" />
                      )}
                    </button>
                    {open && (
                      <CardContent className="space-y-4 border-t border-border pt-4">
                        <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
                          {job.description}
                        </p>
                        {job.requiredSkills.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {job.requiredSkills.map((skill) => (
                              <span
                                key={skill}
                                className="rounded-md bg-siam-blue/10 px-2 py-1 text-xs text-siam-blue"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {(["OPEN", "IN_PROGRESS", "COMPLETED", "CLOSED"] as const).map(
                            (status) => (
                              <Button
                                key={status}
                                type="button"
                                size="sm"
                                variant={job.status === status ? "default" : "outline"}
                                disabled={pending || job.status === status}
                                onClick={() =>
                                  runAction(() => updateJobPostingStatus(job.id, status))
                                }
                              >
                                {status}
                              </Button>
                            )
                          )}
                        </div>
                        <div>
                          <h3 className="mb-2 text-sm font-semibold">{t("applicants")}</h3>
                          {job.applications.length === 0 ? (
                            <p className="text-sm text-gray-500">{t("noApplicants")}</p>
                          ) : (
                            <ul className="space-y-3">
                              {job.applications.map((app) => (
                                <li
                                  key={app.id}
                                  className="rounded-lg border border-border p-3"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <p className="font-medium">
                                        {app.freelancer.name || app.freelancer.email}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {app.status}
                                        {app.freelancer.freelancerProfile &&
                                          app.freelancer.freelancerProfile.totalReviews > 0 && (
                                            <>
                                              {" "}
                                              · ⭐{" "}
                                              {app.freelancer.freelancerProfile.averageRating.toFixed(
                                                1
                                              )}
                                            </>
                                          )}
                                      </p>
                                      {app.coverNote && (
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                          {app.coverNote}
                                        </p>
                                      )}
                                    </div>
                                    {app.status === "PENDING" && (
                                      <div className="flex gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          disabled={pending}
                                          onClick={() =>
                                            runAction(() =>
                                              respondToJobApplication(app.id, "HIRED")
                                            )
                                          }
                                        >
                                          {t("hire")}
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          disabled={pending}
                                          onClick={() =>
                                            runAction(() =>
                                              respondToJobApplication(app.id, "DECLINED")
                                            )
                                          }
                                        >
                                          {t("decline")}
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {tab === "ads" && (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("createAdTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onAdSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("adTitle")}</label>
                  <Input name="title" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("adImageUrl")}</label>
                  <Input name="imageUrl" required placeholder="https://" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("adTargetUrl")}</label>
                  <Input name="targetUrl" required placeholder="https://" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("adBudget")}</label>
                  <Input name="budgetThb" type="number" min={1} step={1} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("adDailyLimit")}</label>
                  <Input name="dailyLimitThb" type="number" min={1} step={1} />
                </div>
                <Button type="submit" disabled={pending}>
                  {t("createAd")}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>{t("adPerformance")}</CardTitle>
            </CardHeader>
            <CardContent>
              {company.adCampaigns.length === 0 ? (
                <p className="text-sm text-gray-500">{t("noAds")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-gray-500">
                        <th className="pb-2 pr-3 font-medium">Title</th>
                        <th className="pb-2 pr-3 font-medium">{t("impressions")}</th>
                        <th className="pb-2 pr-3 font-medium">{t("clicks")}</th>
                        <th className="pb-2 pr-3 font-medium">{t("ctr")}</th>
                        <th className="pb-2 font-medium">{t("status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {company.adCampaigns.map((ad) => {
                        const ctr =
                          ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0;
                        return (
                          <tr key={ad.id} className="border-b border-border/60">
                            <td className="py-3 pr-3">
                              <p className="font-medium">{ad.title}</p>
                              <p className="text-xs text-gray-500">{formatThb(ad.budget)}</p>
                            </td>
                            <td className="py-3 pr-3">{ad.impressions}</td>
                            <td className="py-3 pr-3">{ad.clicks}</td>
                            <td className="py-3 pr-3">{ctr.toFixed(1)}%</td>
                            <td className="py-3">
                              <div className="flex flex-col gap-2">
                                <span className="text-xs font-medium">{ad.status}</span>
                                {ad.status === "ACTIVE" ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={pending}
                                    onClick={() =>
                                      runAction(() => updateAdCampaignStatus(ad.id, "PAUSED"))
                                    }
                                  >
                                    {t("pauseAd")}
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={pending}
                                    onClick={() =>
                                      runAction(() => updateAdCampaignStatus(ad.id, "ACTIVE"))
                                    }
                                  >
                                    {t("activateAd")}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

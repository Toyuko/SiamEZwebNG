"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  updateCompanyVerification,
  setCompanyUserActive,
  updateCompanyProfileAdmin,
  moderateAdCampaign,
  forceCloseJobPostingAdmin,
} from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AdCampaignStatus, JobPostingStatus } from "@prisma/client";
import { ExternalLink } from "lucide-react";

type CompanyDetail = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  active: boolean;
  createdAt: Date;
  company: {
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
    jobPostings: {
      id: string;
      title: string;
      status: JobPostingStatus;
      budget: number;
      currency: string;
      _count: { applications: number };
    }[];
    adCampaigns: {
      id: string;
      title: string;
      status: AdCampaignStatus;
      impressions: number;
      clicks: number;
      budget: number;
    }[];
  } | null;
};

function formatThb(satang: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(satang / 100);
}

export function CompanyDetailClient({ companyUser }: { companyUser: CompanyDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const company = companyUser.company;

  if (!company) {
    return <p className="text-red-600">Company profile missing for this user.</p>;
  }

  function run(action: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{company.companyName}</CardTitle>
              <p className="text-sm text-gray-500">{companyUser.email}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <a href={`/en/companies/${company.slug}`} target="_blank" rel="noopener noreferrer">
                Public profile
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Slug</dt>
              <dd className="font-mono">{company.slug}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Industry</dt>
              <dd>{company.industry ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Tax ID</dt>
              <dd>{company.taxId ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Size</dt>
              <dd>{company.companySize ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Address</dt>
              <dd>{company.address ?? "—"}</dd>
            </div>
            {company.website && (
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Website</dt>
                <dd>
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-siam-blue hover:underline"
                  >
                    {company.website}
                  </a>
                </dd>
              </div>
            )}
            {company.description && (
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Description</dt>
                <dd className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {company.description}
                </dd>
              </div>
            )}
          </dl>

          <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
            <span className="text-sm font-medium">Verification:</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                company.isVerified
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              )}
            >
              {company.isVerified ? "Verified" : "Unverified"}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending || company.isVerified}
              onClick={() => run(() => updateCompanyVerification(company.id, true))}
            >
              Verify business
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending || !company.isVerified}
              onClick={() => run(() => updateCompanyVerification(company.id, false))}
            >
              Revoke verification
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
            <span className="text-sm font-medium">Account:</span>
            <span className="text-sm">{companyUser.active ? "Active" : "Suspended"}</span>
            {companyUser.active ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => run(() => setCompanyUserActive(companyUser.id, false))}
              >
                Suspend
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => run(() => setCompanyUserActive(companyUser.id, true))}
              >
                Reactivate
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Support edits</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              run(() =>
                updateCompanyProfileAdmin(company.id, {
                  companyName: String(fd.get("companyName") ?? ""),
                  slug: String(fd.get("slug") ?? ""),
                  taxId: String(fd.get("taxId") ?? ""),
                })
              );
            }}
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Company name
              </label>
              <Input name="companyName" defaultValue={company.companyName} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Slug</label>
              <Input name="slug" defaultValue={company.slug} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Tax ID</label>
              <Input name="taxId" defaultValue={company.taxId ?? ""} />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" size="sm" disabled={pending}>
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job postings ({company.jobPostings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {company.jobPostings.length === 0 ? (
            <p className="text-sm text-gray-500">No job postings.</p>
          ) : (
            <ul className="space-y-3">
              {company.jobPostings.map((job) => (
                <li
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="font-medium">{job.title}</p>
                    <p className="text-xs text-gray-500">
                      {job.status} · {formatThb(job.budget)} · {job._count.applications}{" "}
                      applicants
                    </p>
                  </div>
                  {job.status !== "CLOSED" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => run(() => forceCloseJobPostingAdmin(job.id))}
                    >
                      Force close
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ad campaigns ({company.adCampaigns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {company.adCampaigns.length === 0 ? (
            <p className="text-sm text-gray-500">No ad campaigns.</p>
          ) : (
            <ul className="space-y-3">
              {company.adCampaigns.map((ad) => (
                <li
                  key={ad.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="font-medium">{ad.title}</p>
                    <p className="text-xs text-gray-500">
                      {ad.status} · {ad.impressions} imp · {ad.clicks} clicks ·{" "}
                      {formatThb(ad.budget)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {ad.status !== "ACTIVE" && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending}
                        onClick={() => run(() => moderateAdCampaign(ad.id, "ACTIVE"))}
                      >
                        Approve
                      </Button>
                    )}
                    {ad.status !== "PAUSED" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => run(() => moderateAdCampaign(ad.id, "PAUSED"))}
                      >
                        Pause
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

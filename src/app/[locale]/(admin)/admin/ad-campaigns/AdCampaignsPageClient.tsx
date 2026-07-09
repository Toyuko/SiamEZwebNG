"use client";

import { useTransition } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { moderateAdCampaign } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AdCampaignStatus } from "@prisma/client";

type CampaignRow = {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  budget: number;
  impressions: number;
  clicks: number;
  status: AdCampaignStatus;
  company: {
    id: string;
    companyName: string;
    slug: string;
    isVerified: boolean;
    userId: string;
  };
};

function formatThb(satang: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(satang / 100);
}

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-gray-100 text-gray-700",
};

export function AdCampaignsPageClient({
  campaigns,
  total,
  page,
  totalPages,
  search,
  status,
}: {
  campaigns: CampaignRow[];
  total: number;
  page: number;
  totalPages: number;
  search?: string;
  status?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function queryBase() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const qs = params.toString();
    return qs ? `?${qs}&` : "?";
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ad campaigns</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Moderate sponsored placements. Approve PENDING campaigns to make them live.
        </p>
      </div>

      <form
        className="mt-6 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const s = String(fd.get("search") ?? "").trim();
          const st = String(fd.get("status") ?? "");
          const params = new URLSearchParams();
          if (s) params.set("search", s);
          if (st) params.set("status", st);
          const qs = params.toString();
          startTransition(() => {
            router.push(`/admin/ad-campaigns${qs ? `?${qs}` : ""}`);
          });
        }}
      >
        <div className="min-w-[200px] flex-1">
          <Input name="search" placeholder="Search title or company…" defaultValue={search} />
        </div>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
        </select>
        <Button type="submit">Filter</Button>
      </form>

      <Card className="mt-4">
        <CardContent className="p-0">
          {campaigns.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No campaigns found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
                    <th className="px-4 py-3 font-medium">Campaign</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Budget</th>
                    <th className="px-4 py-3 font-medium">Perf</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((ad) => {
                    const ctr =
                      ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "0.0";
                    return (
                      <tr
                        key={ad.id}
                        className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/50"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium">{ad.title}</p>
                          <a
                            href={ad.targetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-siam-blue hover:underline"
                          >
                            Target URL
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/companies/${ad.company.userId}`}
                            className="text-siam-blue hover:underline"
                          >
                            {ad.company.companyName}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{formatThb(ad.budget)}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {ad.impressions} imp · {ad.clicks} clk · {ctr}% CTR
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                              statusStyles[ad.status]
                            )}
                          >
                            {ad.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {ad.status !== "ACTIVE" && (
                              <Button
                                type="button"
                                size="sm"
                                disabled={pending}
                                onClick={() =>
                                  startTransition(async () => {
                                    await moderateAdCampaign(ad.id, "ACTIVE");
                                    router.refresh();
                                  })
                                }
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
                                onClick={() =>
                                  startTransition(async () => {
                                    await moderateAdCampaign(ad.id, "PAUSED");
                                    router.refresh();
                                  })
                                }
                              >
                                {ad.status === "PENDING" ? "Reject" : "Pause"}
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
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-800">
              <p className="text-sm text-gray-500">{total} campaigns</p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/ad-campaigns${queryBase()}page=${page - 1}`}>
                      Previous
                    </Link>
                  </Button>
                )}
                {page < totalPages && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/ad-campaigns${queryBase()}page=${page + 1}`}>Next</Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

"use client";

import { Link } from "@/i18n/navigation";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CompanyRow = {
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
    industry: string | null;
    isVerified: boolean;
    _count: { jobPostings: number; adCampaigns: number };
  } | null;
};

export function CompanyTable({
  companies,
  total,
  page,
  totalPages,
  search,
  verified,
}: {
  companies: CompanyRow[];
  total: number;
  page: number;
  totalPages: number;
  search?: string;
  verified?: string;
}) {
  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500">No companies found.</p>
      </div>
    );
  }

  const queryBase = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (verified) params.set("verified", verified);
    const qs = params.toString();
    return qs ? `?${qs}&` : "?";
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Industry</th>
              <th className="px-4 py-3 font-medium">Verified</th>
              <th className="px-4 py-3 font-medium">Jobs</th>
              <th className="px-4 py-3 font-medium">Ads</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="w-16 px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((row) => {
              const c = row.company;
              return (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/50"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{c?.companyName ?? row.name ?? "—"}</p>
                    <p className="text-xs text-gray-500">{row.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{c?.slug ?? "—"}</td>
                  <td className="px-4 py-3">{c?.industry ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                        c?.isVerified
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                      )}
                    >
                      {c?.isVerified ? "Verified" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{c?._count.jobPostings ?? 0}</td>
                  <td className="px-4 py-3">{c?._count.adCampaigns ?? 0}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                        row.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {row.active ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/companies/${row.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-800">
          <p className="text-sm text-gray-500">
            {total} compan{total !== 1 ? "ies" : "y"}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/companies${queryBase()}page=${page - 1}`}>Previous</Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/companies${queryBase()}page=${page + 1}`}>Next</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

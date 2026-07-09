"use client";

import { useTransition } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { forceCloseJobPostingAdmin } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { JobPostingStatus } from "@prisma/client";

type PostingRow = {
  id: string;
  title: string;
  status: JobPostingStatus;
  budget: number;
  currency: string;
  requiredSkills: string[];
  createdAt: Date;
  company: {
    id: string;
    companyName: string;
    slug: string;
    userId: string;
    isVerified: boolean;
  };
  _count: { applications: number };
};

function formatThb(satang: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(satang / 100);
}

const statusStyles: Record<string, string> = {
  OPEN: "bg-green-100 text-green-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-gray-100 text-gray-700",
  CLOSED: "bg-red-100 text-red-800",
};

export function CompanyJobsPageClient({
  postings,
  total,
  page,
  totalPages,
  search,
  status,
}: {
  postings: PostingRow[];
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Company job postings
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Overview of corporate hiring posts. Force-close abusive or outdated listings.
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
            router.push(`/admin/company-jobs${qs ? `?${qs}` : ""}`);
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
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CLOSED">Closed</option>
        </select>
        <Button type="submit">Filter</Button>
      </form>

      <Card className="mt-4">
        <CardContent className="p-0">
          {postings.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No job postings found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
                    <th className="px-4 py-3 font-medium">Job</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Budget</th>
                    <th className="px-4 py-3 font-medium">Applicants</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {postings.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/50"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{job.title}</p>
                        {job.requiredSkills.length > 0 && (
                          <p className="text-xs text-gray-500">
                            {job.requiredSkills.slice(0, 4).join(", ")}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/companies/${job.company.userId}`}
                          className="text-siam-blue hover:underline"
                        >
                          {job.company.companyName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{formatThb(job.budget)}</td>
                      <td className="px-4 py-3">{job._count.applications}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                            statusStyles[job.status]
                          )}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {job.status !== "CLOSED" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() =>
                              startTransition(async () => {
                                await forceCloseJobPostingAdmin(job.id);
                                router.refresh();
                              })
                            }
                          >
                            Force close
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-800">
              <p className="text-sm text-gray-500">{total} postings</p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/company-jobs${queryBase()}page=${page - 1}`}>
                      Previous
                    </Link>
                  </Button>
                )}
                {page < totalPages && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/company-jobs${queryBase()}page=${page + 1}`}>Next</Link>
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

"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { formatJobAmount } from "@/data-access/job";
import { approveFreelancerJob } from "@/actions/admin";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@prisma/client";

type JobRow = {
  id: string;
  title: string;
  status: JobStatus;
  amount: number;
  currency: string;
  completionSubmittedAt: Date | null;
  postedBy: { id: string; name: string | null; email: string };
  freelancer: { id: string; name: string | null; email: string } | null;
};

const jobStatusStyles: Record<string, string> = {
  open: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
};

export function FreelancerJobsPageClient({
  jobs,
  total,
  page,
  totalPages,
  search,
  status,
}: {
  jobs: JobRow[];
  total: number;
  page: number;
  totalPages: number;
  search?: string;
  status?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = String(fd.get("search") ?? "").trim();
    const st = String(fd.get("status") ?? "");
    startTransition(() => {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      if (st) params.set("status", st);
      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    });
  }

  function handleApprove(jobId: string) {
    startTransition(async () => {
      await approveFreelancerJob(jobId);
      router.refresh();
    });
  }

  const queryBase = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const qs = params.toString();
    return qs ? `?${qs}&` : "?";
  };

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Freelancer jobs</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          All platform jobs posted by clients and assigned to freelancers.
        </p>
      </div>

      <form onSubmit={handleSearch} className="mt-6 flex flex-wrap gap-2">
        <Input
          name="search"
          placeholder="Search title or email..."
          defaultValue={search}
          className="w-64"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed (awaiting approval)</option>
          <option value="approved">Approved</option>
        </select>
        <Button type="submit" variant="outline" size="icon" disabled={pending}>
          <Search className="h-4 w-4" />
        </Button>
      </form>

      <Card className="mt-4">
        <CardContent className="p-0">
          {jobs.length === 0 ? (
            <p className="p-8 text-center text-gray-500">No jobs found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Freelancer</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="px-4 py-3 font-medium">{job.title}</td>
                      <td className="px-4 py-3">
                        {job.postedBy.name ?? job.postedBy.email}
                      </td>
                      <td className="px-4 py-3">
                        {job.freelancer
                          ? job.freelancer.name ?? job.freelancer.email
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {formatJobAmount(job.amount, job.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                            jobStatusStyles[job.status]
                          )}
                        >
                          {job.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/portal/jobs/${job.id}`}>View</Link>
                          </Button>
                          {job.status === "completed" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              disabled={pending}
                              onClick={() => handleApprove(job.id)}
                            >
                              Approve
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-gray-500">{total} jobs</p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/freelancer-jobs${queryBase()}page=${page - 1}`}>
                      Previous
                    </Link>
                  </Button>
                )}
                {page < totalPages && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/freelancer-jobs${queryBase()}page=${page + 1}`}>
                      Next
                    </Link>
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

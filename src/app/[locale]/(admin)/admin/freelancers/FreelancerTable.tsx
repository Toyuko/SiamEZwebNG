"use client";

import { Link } from "@/i18n/navigation";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FreelancerRow = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  active: boolean;
  createdAt: Date;
  freelancerProfile: {
    verificationStatus: string;
    averageRating: number;
    totalReviews: number;
    skills: string[];
  } | null;
  _count: { jobsAsFreelancer: number };
};

const verificationStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  verified: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export function FreelancerTable({
  freelancers,
  total,
  page,
  totalPages,
  search,
  verification,
}: {
  freelancers: FreelancerRow[];
  total: number;
  page: number;
  totalPages: number;
  search?: string;
  verification?: string;
}) {
  if (freelancers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500">No freelancers found.</p>
      </div>
    );
  }

  const queryBase = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (verification) params.set("verification", verification);
    const qs = params.toString();
    return qs ? `?${qs}&` : "?";
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Verification</th>
              <th className="px-4 py-3 font-medium">Rating</th>
              <th className="px-4 py-3 font-medium">Jobs</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="w-16 px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {freelancers.map((f) => {
              const vStatus = f.freelancerProfile?.verificationStatus ?? "pending";
              return (
                <tr
                  key={f.id}
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/50"
                >
                  <td className="px-4 py-3 font-medium">{f.name ?? "—"}</td>
                  <td className="px-4 py-3">{f.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize",
                        verificationStyles[vStatus] ?? verificationStyles.pending
                      )}
                    >
                      {vStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {f.freelancerProfile && f.freelancerProfile.totalReviews > 0
                      ? `⭐ ${f.freelancerProfile.averageRating.toFixed(1)} (${f.freelancerProfile.totalReviews})`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">{f._count.jobsAsFreelancer}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                        f.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {f.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/freelancers/${f.id}`}>
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
            {total} freelancer{total !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/freelancers${queryBase()}page=${page - 1}`}>Previous</Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/freelancers${queryBase()}page=${page + 1}`}>Next</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

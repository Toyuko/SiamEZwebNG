"use client";

import { Card, CardContent } from "@/components/ui/card";
import { FreelancerSearch } from "./FreelancerSearch";
import { FreelancerTable } from "./FreelancerTable";

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
    skills: string[];
  } | null;
  _count: { jobsAsFreelancer: number };
};

export function FreelancersPageClient({
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
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Freelancers</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Manage freelancer accounts, verification, and job activity.
        </p>
      </div>
      <div className="mt-6">
        <FreelancerSearch defaultValue={search} defaultVerification={verification} />
      </div>
      <Card className="mt-4">
        <CardContent className="p-0">
          <FreelancerTable
            freelancers={freelancers}
            total={total}
            page={page}
            totalPages={totalPages}
            search={search}
            verification={verification}
          />
        </CardContent>
      </Card>
    </>
  );
}

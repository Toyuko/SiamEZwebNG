"use client";

import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CompanySearch } from "./CompanySearch";
import { CompanyTable } from "./CompanyTable";

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

export function CompaniesPageClient({
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
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Companies</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage corporate accounts, verification, jobs, and ad campaigns.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/companies/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Add company
          </Link>
        </Button>
      </div>
      <div className="mt-6">
        <CompanySearch defaultValue={search} defaultVerified={verified} />
      </div>
      <Card className="mt-4">
        <CardContent className="p-0">
          <CompanyTable
            companies={companies}
            total={total}
            page={page}
            totalPages={totalPages}
            search={search}
            verified={verified}
          />
        </CardContent>
      </Card>
    </>
  );
}

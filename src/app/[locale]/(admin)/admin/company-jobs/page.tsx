import type { JobPostingStatus } from "@prisma/client";
import { getCompanyJobPostingsAdmin } from "@/actions/admin";
import { CompanyJobsPageClient } from "./CompanyJobsPageClient";

export default async function AdminCompanyJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? undefined;
  const page = Number(params.page) || 1;
  const status = ["OPEN", "IN_PROGRESS", "COMPLETED", "CLOSED"].includes(params.status ?? "")
    ? (params.status as JobPostingStatus)
    : undefined;

  const { postings, total, totalPages } = await getCompanyJobPostingsAdmin({
    search,
    page,
    status,
  });

  return (
    <CompanyJobsPageClient
      postings={postings}
      total={total}
      page={page}
      totalPages={totalPages}
      search={search}
      status={params.status}
    />
  );
}

import { getFreelancerJobsAdmin } from "@/actions/admin";
import { FreelancerJobsPageClient } from "./FreelancerJobsPageClient";
import type { JobStatus } from "@prisma/client";

export default async function AdminFreelancerJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? undefined;
  const page = Number(params.page) || 1;
  const status = params.status as JobStatus | undefined;

  const { jobs, total, totalPages } = await getFreelancerJobsAdmin({
    search,
    page,
    status,
  });

  return (
    <FreelancerJobsPageClient
      jobs={jobs}
      total={total}
      page={page}
      totalPages={totalPages}
      search={search}
      status={params.status}
    />
  );
}

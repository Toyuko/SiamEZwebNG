import { getFreelancersAdmin } from "@/actions/admin";
import { FreelancersPageClient } from "./FreelancersPageClient";
import type { FreelancerVerificationStatus } from "@prisma/client";

export default async function AdminFreelancersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; verification?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? undefined;
  const page = Number(params.page) || 1;
  const verification = params.verification as FreelancerVerificationStatus | undefined;

  const { freelancers, total, totalPages } = await getFreelancersAdmin({
    search,
    page,
    verification,
  });

  return (
    <FreelancersPageClient
      freelancers={freelancers}
      total={total}
      page={page}
      totalPages={totalPages}
      search={search}
      verification={params.verification}
    />
  );
}

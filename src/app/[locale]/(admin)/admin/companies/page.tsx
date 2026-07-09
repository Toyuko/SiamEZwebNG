import { getCompaniesAdmin } from "@/actions/admin";
import { CompaniesPageClient } from "./CompaniesPageClient";

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; verified?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? undefined;
  const page = Number(params.page) || 1;
  const verified =
    params.verified === "true" || params.verified === "false"
      ? params.verified
      : undefined;

  const { companies, total, totalPages } = await getCompaniesAdmin({
    search,
    page,
    verified,
  });

  return (
    <CompaniesPageClient
      companies={companies}
      total={total}
      page={page}
      totalPages={totalPages}
      search={search}
      verified={verified}
    />
  );
}

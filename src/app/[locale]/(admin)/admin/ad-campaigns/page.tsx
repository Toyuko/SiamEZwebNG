import type { AdCampaignStatus } from "@prisma/client";
import { getAdCampaignsAdmin } from "@/actions/admin";
import { AdCampaignsPageClient } from "./AdCampaignsPageClient";

export default async function AdminAdCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? undefined;
  const page = Number(params.page) || 1;
  const status = ["PENDING", "ACTIVE", "PAUSED"].includes(params.status ?? "")
    ? (params.status as AdCampaignStatus)
    : undefined;

  const { campaigns, total, totalPages } = await getAdCampaignsAdmin({
    search,
    page,
    status,
  });

  return (
    <AdCampaignsPageClient
      campaigns={campaigns}
      total={total}
      page={page}
      totalPages={totalPages}
      search={search}
      status={params.status}
    />
  );
}

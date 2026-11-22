import { Card, CardContent } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { getServices, getFreelancerJobsAdmin } from "@/actions/admin";
import { ServiceJobsPageClient } from "./ServiceJobsPageClient";
import { MarketplaceJobsTable } from "./MarketplaceJobsTable";
import { MarketplaceJobsFilter } from "./MarketplaceJobsFilter";
import type { JobStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/** Internal Service Jobs list is consolidated into Work Center.
 * Marketplace freelancer jobs remain on this route with ?source=freelancer.
 */
export default async function AdminServiceJobsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    serviceId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    source?: string;
  }>;
}) {
  const params = await searchParams;

  if (params.source !== "freelancer") {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.serviceId) qs.set("serviceId", params.serviceId);
    if (params.dateFrom) qs.set("dateFrom", params.dateFrom);
    if (params.dateTo) qs.set("dateTo", params.dateTo);
    if (params.page) qs.set("page", params.page);
    if (params.status === "awaiting_payment") qs.set("tab", "awaiting_payment");
    else if (params.status === "completed") qs.set("tab", "completed");
    else if (params.status === "cancelled") qs.set("tab", "cancelled");
    else if (params.status === "in_progress") qs.set("tab", "in_progress");
    else if (params.status === "pending_docs") qs.set("tab", "awaiting_customer");
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    redirect(`/admin/work-center${suffix}`);
  }

  const search = params.search ?? undefined;
  const page = Number(params.page) || 1;
  const services = await getServices();
  const jobStatus =
    params.status && params.status !== "all" ? (params.status as JobStatus) : undefined;

  const { jobs, total, totalPages } = await getFreelancerJobsAdmin({
    search,
    page,
    status: jobStatus,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-siam-ink sm:text-2xl">
            Freelancer Jobs
          </h1>
          <p className="mt-1 text-sm text-siam-ink-muted">
            Marketplace assignments for freelancers (separate from internal Work Center).
          </p>
        </div>
        <ServiceJobsPageClient
          services={services}
          clients={[]}
          staffUsers={[]}
          marketplaceOnly
        />
      </div>

      <MarketplaceJobsFilter searchDefault={search} statusDefault={params.status} />

      <Card>
        <CardContent className="pt-6">
          <MarketplaceJobsTable
            jobs={jobs}
            total={total}
            page={page}
            totalPages={totalPages}
            searchParams={{
              search,
              status: params.status,
              page: params.page,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

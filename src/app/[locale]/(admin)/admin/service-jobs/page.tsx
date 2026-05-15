import { Card, CardContent } from "@/components/ui/card";
import { getServiceJobs, getServices, getClients, getStaffUsers, getFreelancerJobsAdmin } from "@/actions/admin";
import { ServiceJobsTable } from "./ServiceJobsTable";
import { ServiceJobsFilter } from "./ServiceJobsFilter";
import { ServiceJobsPageClient } from "./ServiceJobsPageClient";
import { MarketplaceJobsTable } from "./MarketplaceJobsTable";
import { MarketplaceJobsFilter } from "./MarketplaceJobsFilter";
import type { JobStatus } from "@prisma/client";

type CaseStatus =
  | "new"
  | "under_review"
  | "quoted"
  | "awaiting_payment"
  | "paid"
  | "in_progress"
  | "pending_docs"
  | "completed"
  | "cancelled";

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
  const isMarketplace = params.source === "freelancer";
  const search = params.search ?? undefined;
  const page = Number(params.page) || 1;

  const services = await getServices();

  if (isMarketplace) {
    const jobStatus =
      params.status && params.status !== "all"
        ? (params.status as JobStatus)
        : undefined;

    const { jobs, total, totalPages } = await getFreelancerJobsAdmin({
      search,
      page,
      status: jobStatus,
    });

    const clientsResult = await getClients({ page: 1 });

    return (
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Freelancer Jobs
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Marketplace jobs dispatched to the freelancer portal. Auto-approval runs after 1
              hour when enabled.
            </p>
          </div>
          <ServiceJobsPageClient
            services={services}
            clients={clientsResult.clients}
            staffUsers={[]}
            marketplaceOnly
          />
        </div>

        <MarketplaceJobsFilter searchDefault={search} statusDefault={params.status ?? "all"} />

        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Showing {total} marketplace job{total !== 1 ? "s" : ""}
        </p>

        <Card className="mt-4">
          <CardContent className="p-0">
            <MarketplaceJobsTable
              jobs={jobs}
              total={total}
              page={page}
              totalPages={totalPages}
              searchParams={params}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = (params.status && params.status !== "all"
    ? params.status
    : undefined) as CaseStatus | undefined;
  const serviceId = params.serviceId ?? undefined;
  const dateFrom = params.dateFrom ?? undefined;
  const dateTo = params.dateTo ?? undefined;

  const [{ jobs, total, totalPages }, clientsResult, staffUsers] = await Promise.all([
    getServiceJobs({
      search,
      status: status ?? "all",
      serviceId,
      dateFrom,
      dateTo,
      page,
    }),
    getClients({ page: 1 }),
    getStaffUsers(),
  ]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Service Jobs Management
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Create and manage internal service jobs. Assign staff and track status.
          </p>
        </div>
        <ServiceJobsPageClient
          services={services}
          clients={clientsResult.clients}
          staffUsers={staffUsers}
        />
      </div>

      <ServiceJobsFilter
        searchDefault={search}
        statusDefault={params.status ?? "all"}
        serviceIdDefault={serviceId}
        dateFromDefault={dateFrom}
        dateToDefault={dateTo}
        services={services}
      />

      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        Showing {total} internal job{total !== 1 ? "s" : ""}
      </p>

      <Card className="mt-4">
        <CardContent className="p-0">
          <ServiceJobsTable
            jobs={jobs}
            total={total}
            page={page}
            totalPages={totalPages}
            searchParams={params}
            staffUsers={staffUsers}
          />
        </CardContent>
      </Card>
    </div>
  );
}

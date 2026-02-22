import { Card, CardContent } from "@/components/ui/card";
import { getServiceJobs, getServices, getClients, getStaffUsers } from "@/actions/admin";
import { ServiceJobsTable } from "./ServiceJobsTable";
import { ServiceJobsFilter } from "./ServiceJobsFilter";
import { ServiceJobsPageClient } from "./ServiceJobsPageClient";

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
  }>;
}) {
  const params = await searchParams;
  const search = params.search ?? undefined;
  const status = (params.status && params.status !== "all"
    ? params.status
    : undefined) as CaseStatus | undefined;
  const serviceId = params.serviceId ?? undefined;
  const dateFrom = params.dateFrom ?? undefined;
  const dateTo = params.dateTo ?? undefined;
  const page = Number(params.page) || 1;

  const [{ jobs, total, totalPages }, services] = await Promise.all([
    getServiceJobs({
      search,
      status: status ?? "all",
      serviceId,
      dateFrom,
      dateTo,
      page,
    }),
    getServices(),
  ]);

  const [clientsResult, staffUsers] = await Promise.all([
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
            Create and manage service jobs. Assign staff and track status.
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
        Showing {total} job{total !== 1 ? "s" : ""}
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

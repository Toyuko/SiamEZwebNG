import { getServices, getStaffUsers } from "@/actions/admin";
import { listJobsAction } from "@/actions/job-intake";
import { JobsList } from "@/components/admin/jobs/JobsList";
import { isAssignableJobStaff, type ScheduleWindow } from "@/lib/jobs/intake";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const window = (params.window as ScheduleWindow | undefined) ?? "all";
  const [result, services, staff] = await Promise.all([
    listJobsAction({
      search: params.search,
      window,
      staffId: params.staffId,
      closedById: params.closedById,
      serviceId: params.serviceId,
      status: params.status,
      paymentStatus: (params.paymentStatus as "unpaid" | "partial" | "paid" | "all" | undefined) ?? "all",
      source: params.source,
      page: Number(params.page) || 1,
    }),
    getServices(),
    getStaffUsers(),
  ]);

  return (
    <JobsList
      jobs={result.jobs}
      total={result.total}
      page={result.page}
      totalPages={result.totalPages}
      services={services.filter((service) => service.active).map((service) => ({ id: service.id, name: service.name }))}
      staff={staff.filter((person) => isAssignableJobStaff(person))}
      filters={params}
    />
  );
}

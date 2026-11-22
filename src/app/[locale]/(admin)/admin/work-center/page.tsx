import { getServices } from "@/actions/admin";
import { listWorkCenterAction } from "@/actions/work-center";
import { listAssignablePeople } from "@/data-access/job-intake";
import { WorkCenterClient } from "@/components/admin/work-center/WorkCenterClient";
import { isWorkCenterTab } from "@/lib/admin/work-center";

export const dynamic = "force-dynamic";

export default async function WorkCenterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const tab = isWorkCenterTab(params.tab) ? params.tab : "all";

  const [result, services, staff] = await Promise.all([
    listWorkCenterAction({
      tab,
      search: params.search,
      staffId: params.staffId,
      serviceId: params.serviceId,
      paymentStatus:
        (params.paymentStatus as "unpaid" | "partial" | "paid" | "all" | undefined) ?? "all",
      source: params.source,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      page: Number(params.page) || 1,
    }),
    getServices(),
    listAssignablePeople(),
  ]);

  return (
    <WorkCenterClient
      items={result.items}
      total={result.total}
      page={result.page}
      totalPages={result.totalPages}
      tab={result.tab}
      services={services
        .filter((service) => service.active)
        .map((service) => ({ id: service.id, name: service.name }))}
      staff={staff}
      filters={params}
    />
  );
}

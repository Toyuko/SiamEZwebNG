import { Card, CardContent } from "@/components/ui/card";
import { getCases, getServices } from "@/actions/admin";
import { CaseTable } from "./CaseTable";
import { CaseFilter } from "./CaseFilter";
import { CaseSearch } from "./CaseSearch";

export default async function AdminCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; serviceId?: string; search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status =
    params.status && params.status !== "all"
      ? (params.status as "new" | "under_review" | "quoted" | "awaiting_payment" | "paid" | "in_progress" | "pending_docs" | "completed" | "cancelled")
      : undefined;
  const serviceId = params.serviceId ?? undefined;
  const search = params.search ?? undefined;
  const page = Number(params.page) || 1;

  const [{ cases, total, totalPages }, services] = await Promise.all([
    getCases({ status: status ?? "all", serviceId, search, page }),
    getServices(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Cases
      </h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        Manage all cases: status, assignments, notes, and documents.
      </p>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
        <CaseFilter statusDefault={params.status ?? "all"} serviceIdDefault={params.serviceId} services={services} />
        <CaseSearch defaultValue={search} status={params.status} serviceId={params.serviceId} />
      </div>
      <Card className="mt-4">
        <CardContent className="p-0">
          <CaseTable
            cases={cases}
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

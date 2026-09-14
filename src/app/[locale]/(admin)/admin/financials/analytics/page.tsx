import { FinancialsSubnav } from "@/components/admin/finance/FinancialsSubnav";
import { AnalyticsBuilderClient } from "@/components/admin/finance/AnalyticsBuilderClient";
import {
  getAnalyticsFilterOptionsAction,
  listSavedFinancialReportsAction,
} from "@/actions/finance-analytics";
import type { AnalyticsConfigInput } from "@/actions/finance-analytics";

export default async function FinancialsAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ reportId?: string }>;
}) {
  const params = await searchParams;
  const [filterOptions, reports] = await Promise.all([
    getAnalyticsFilterOptionsAction(),
    listSavedFinancialReportsAction(),
  ]);

  const saved = params.reportId
    ? reports.find((r) => r.id === params.reportId)
    : null;
  const initialConfig = (saved?.config ?? undefined) as
    | AnalyticsConfigInput
    | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Financial analytics
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Slice revenue, costs, and profit by day, week, month, service, staff, payment
          method, and more — all from the same ledger.
          {saved ? (
            <>
              {" "}
              Loaded saved report: <strong>{saved.name}</strong>.
            </>
          ) : null}
        </p>
      </div>
      <FinancialsSubnav current="/admin/financials/analytics" />
      <AnalyticsBuilderClient
        filterOptions={{
          services: filterOptions.services,
          staff: filterOptions.staff,
          paymentMethods: filterOptions.paymentMethods,
          caseStatuses: filterOptions.caseStatuses,
        }}
        initialConfig={initialConfig}
        savedReportId={saved?.id}
      />
    </div>
  );
}

import { FinancialsSubnav } from "@/components/admin/finance/FinancialsSubnav";
import { FinanceTable } from "@/components/admin/finance/FinanceUi";
import { DeleteSavedReportButton } from "@/components/admin/finance/DeleteSavedReportButton";
import { listSavedFinancialReportsAction } from "@/actions/finance-analytics";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function SavedFinancialReportsPage() {
  const reports = await listSavedFinancialReportsAction();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Saved reports
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Re-open analytics configurations you use often.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/financials/analytics">New analytics</Link>
        </Button>
      </div>
      <FinancialsSubnav current="/admin/financials/saved-reports" />

      <FinanceTable headers={["Name", "Updated", "Actions"]}>
        {reports.length === 0 ? (
          <tr>
            <td colSpan={3} className="px-3 py-8 text-center text-gray-500">
              No saved reports yet. Build one in Analytics and click Save report.
            </td>
          </tr>
        ) : (
          reports.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2">
                <p className="font-medium">{r.name}</p>
                {r.description ? (
                  <p className="text-xs text-gray-500">{r.description}</p>
                ) : null}
              </td>
              <td className="px-3 py-2 text-sm text-gray-500">
                {r.updatedAt.toISOString().slice(0, 10)}
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/admin/financials/analytics?reportId=${r.id}`}>
                      Open
                    </Link>
                  </Button>
                  <DeleteSavedReportButton id={r.id} />
                </div>
              </td>
            </tr>
          ))
        )}
      </FinanceTable>
    </div>
  );
}

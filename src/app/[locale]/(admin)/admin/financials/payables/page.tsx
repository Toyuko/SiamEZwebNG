import { fetchPayablesAction } from "@/actions/finance";
import { formatCurrency } from "@/lib/utils";
import { FinanceTable, StatusPill, money } from "@/components/admin/finance/FinanceUi";
import { FinancialsSubnav } from "@/components/admin/finance/FinancialsSubnav";
import { ExportCsvButton } from "@/components/admin/finance/ExportCsvButton";
import { MarkPaidButton } from "@/components/admin/finance/MarkPaidButton";
import { Link } from "@/i18n/navigation";

export default async function FinancialsPayablesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const rows = await fetchPayablesAction(params.status);
  const unpaidTotal = rows
    .filter((r) => r.status === "UNPAID" || r.status === "APPROVED")
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payables</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Unpaid staff payments and vendor expenses. Open total:{" "}
            <span className="font-medium tabular-nums text-gray-900 dark:text-white">
              {money(unpaidTotal)}
            </span>
          </p>
        </div>
        <ExportCsvButton report="payables" />
      </div>

      <FinancialsSubnav current="/admin/financials/payables" />

      <form className="flex flex-wrap gap-2">
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="">Unpaid / approved (default)</option>
          <option value="UNPAID">Unpaid</option>
          <option value="APPROVED">Approved</option>
          <option value="PAID">Paid</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
        >
          Filter
        </button>
      </form>

      <FinanceTable
        headers={["Payee", "Case", "Category", "Amount", "Due Date", "Status", "Actions"]}
      >
        {rows.length === 0 ? (
          <tr>
            <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
              No payables match this filter.
            </td>
          </tr>
        ) : (
          rows.map((r) => {
            const canMarkPaid = r.status === "UNPAID" || r.status === "APPROVED";
            return (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                <td className="px-3 py-2">{r.payee}</td>
                <td className="px-3 py-2">
                  {r.caseId && r.caseNumber ? (
                    <Link
                      href={`/admin/cases/${r.caseId}`}
                      className="text-teal-700 hover:underline dark:text-teal-300"
                    >
                      {r.caseNumber}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className="text-gray-500">{r.type.replace(/_/g, " ")}</span>
                  {" · "}
                  {r.category.replace(/_/g, " ")}
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                  {formatCurrency(r.amount, r.currency)}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {r.dueDate ? r.dueDate.toISOString().slice(0, 10) : "—"}
                </td>
                <td className="px-3 py-2">
                  <StatusPill status={r.status} />
                </td>
                <td className="px-3 py-2">
                  {canMarkPaid ? <MarkPaidButton id={r.id} /> : "—"}
                </td>
              </tr>
            );
          })
        )}
      </FinanceTable>
    </div>
  );
}

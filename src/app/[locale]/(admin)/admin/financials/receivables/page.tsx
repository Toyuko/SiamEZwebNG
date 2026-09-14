import { fetchReceivablesAction } from "@/actions/finance";
import { formatCurrency } from "@/lib/utils";
import { FinanceTable, StatusPill, money } from "@/components/admin/finance/FinanceUi";
import { FinancialsSubnav } from "@/components/admin/finance/FinancialsSubnav";
import { ExportCsvButton } from "@/components/admin/finance/ExportCsvButton";
import { Link } from "@/i18n/navigation";

export default async function FinancialsReceivablesPage() {
  const rows = await fetchReceivablesAction();
  const outstandingTotal = rows.reduce((sum, r) => sum + r.outstanding, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Receivables</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Open invoice balances owed by customers. Total outstanding:{" "}
            <span className="font-medium tabular-nums text-gray-900 dark:text-white">
              {money(outstandingTotal)}
            </span>
          </p>
        </div>
        <ExportCsvButton report="receivables" />
      </div>

      <FinancialsSubnav current="/admin/financials/receivables" />

      <FinanceTable
        headers={[
          "Customer",
          "Case",
          "Invoice",
          "Total",
          "Paid",
          "Outstanding",
          "Due Date",
          "Days Overdue",
          "Status",
        ]}
      >
        {rows.length === 0 ? (
          <tr>
            <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
              No outstanding receivables.
            </td>
          </tr>
        ) : (
          rows.map((r) => (
            <tr key={r.invoiceId} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
              <td className="px-3 py-2">{r.customerName}</td>
              <td className="px-3 py-2">
                <Link
                  href={`/admin/cases/${r.caseId}`}
                  className="text-teal-700 hover:underline dark:text-teal-300"
                >
                  {r.caseNumber}
                </Link>
              </td>
              <td className="px-3 py-2 font-mono text-xs">{r.invoiceId.slice(0, 10)}…</td>
              <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                {formatCurrency(r.total, r.currency)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                {formatCurrency(r.paid, r.currency)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums">
                {formatCurrency(r.outstanding, r.currency)}
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                {r.dueDate ? r.dueDate.toISOString().slice(0, 10) : "—"}
              </td>
              <td className="px-3 py-2 tabular-nums">
                {r.daysOverdue > 0 ? r.daysOverdue : "—"}
              </td>
              <td className="px-3 py-2">
                <StatusPill status={r.status} />
              </td>
            </tr>
          ))
        )}
      </FinanceTable>
    </div>
  );
}

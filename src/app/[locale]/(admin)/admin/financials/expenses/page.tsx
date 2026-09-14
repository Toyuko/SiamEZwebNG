import { fetchFinancialTransactionsAction } from "@/actions/finance";
import type { DatePreset } from "@/lib/finance/dates";
import { formatCurrency } from "@/lib/utils";
import { FinanceDateFilter } from "@/components/admin/finance/FinanceDateFilter";
import { FinanceTable, StatusPill } from "@/components/admin/finance/FinanceUi";
import { FinancialsSubnav } from "@/components/admin/finance/FinancialsSubnav";
import { AddOperatingExpenseForm } from "@/components/admin/finance/AddOperatingExpenseForm";
import { ExportCsvButton } from "@/components/admin/finance/ExportCsvButton";
import { Link } from "@/i18n/navigation";

export default async function FinancialsExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; start?: string; end?: string; page?: string }>;
}) {
  const params = await searchParams;
  const preset = (params.preset ?? "this_month") as DatePreset;
  const data = await fetchFinancialTransactionsAction({
    type: "OPERATING_EXPENSE",
    preset,
    start: params.start,
    end: params.end,
    page: Number(params.page) || 1,
  });

  const totalPaid = data.rows
    .filter((r) => r.paymentStatus === "PAID")
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Operating expenses
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Company overhead not tied to a specific case — rent, ads, software, and similar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FinanceDateFilter defaultPreset="this_month" />
          <ExportCsvButton report="expenses" preset={preset} />
        </div>
      </div>

      <FinancialsSubnav current="/admin/financials/expenses" />

      <AddOperatingExpenseForm />

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Paid on this page:{" "}
        <span className="font-medium tabular-nums text-gray-900 dark:text-white">
          {formatCurrency(totalPaid)}
        </span>{" "}
        · showing {data.rows.length} of {data.total}
      </p>

      <FinanceTable
        headers={[
          "Date",
          "Category",
          "Description",
          "Vendor",
          "Amount",
          "Method",
          "Status",
          "Created by",
        ]}
      >
        {data.rows.length === 0 ? (
          <tr>
            <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
              No operating expenses in this period.
            </td>
          </tr>
        ) : (
          data.rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
              <td className="whitespace-nowrap px-3 py-2">
                {r.transactionDate.toISOString().slice(0, 10)}
              </td>
              <td className="px-3 py-2">{r.category.replace(/_/g, " ")}</td>
              <td className="max-w-[240px] truncate px-3 py-2">{r.description}</td>
              <td className="px-3 py-2">{r.vendor ?? "—"}</td>
              <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                {formatCurrency(r.amount, r.currency)}
              </td>
              <td className="px-3 py-2">{r.paymentMethod ?? "—"}</td>
              <td className="px-3 py-2">
                <StatusPill status={r.paymentStatus} />
              </td>
              <td className="px-3 py-2">
                {r.createdBy?.name ?? r.createdBy?.email ?? "—"}
              </td>
            </tr>
          ))
        )}
      </FinanceTable>

      <p className="text-sm text-gray-500">
        Case-linked expenses appear on each case and under{" "}
        <Link
          href="/admin/financials/transactions?type=CASE_EXPENSE"
          className="text-teal-700 hover:underline dark:text-teal-300"
        >
          Transactions
        </Link>
        .
      </p>
    </div>
  );
}

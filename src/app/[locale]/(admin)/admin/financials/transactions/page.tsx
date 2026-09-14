import { fetchFinancialTransactionsAction } from "@/actions/finance";
import type { DatePreset } from "@/lib/finance/dates";
import { formatCurrency } from "@/lib/utils";
import { FinanceDateFilter } from "@/components/admin/finance/FinanceDateFilter";
import { FinanceTable, StatusPill } from "@/components/admin/finance/FinanceUi";
import { FinancialsSubnav } from "@/components/admin/finance/FinancialsSubnav";
import { Link } from "@/i18n/navigation";

export default async function FinancialTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    preset?: string;
    type?: string;
    status?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const preset = (params.preset ?? "this_month") as DatePreset;
  const data = await fetchFinancialTransactionsAction({
    preset,
    type: params.type,
    status: params.status,
    q: params.q,
    page: Number(params.page) || 1,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Master ledger for staff payments, expenses, refunds, and other financial movements.
            Customer paid revenue is tracked via Payments &amp; Orders (not duplicated here).
          </p>
        </div>
        <FinanceDateFilter />
      </div>
      <FinancialsSubnav current="/admin/financials/transactions" />

      <form className="flex flex-wrap gap-2">
        <input type="hidden" name="preset" value={preset} />
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search…"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <select
          name="type"
          defaultValue={params.type ?? ""}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="">All types</option>
          <option value="STAFF_PAYMENT">Staff payment</option>
          <option value="CASE_EXPENSE">Case expense</option>
          <option value="OPERATING_EXPENSE">Operating expense</option>
          <option value="REFUND">Refund</option>
          <option value="OTHER_INCOME">Other income</option>
          <option value="OTHER_EXPENSE">Other expense</option>
          <option value="REVENUE">Revenue (manual)</option>
        </select>
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="">All statuses</option>
          <option value="UNPAID">Unpaid</option>
          <option value="APPROVED">Approved</option>
          <option value="PAID">Paid</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
        >
          Filter
        </button>
      </form>

      <FinanceTable
        headers={[
          "Date",
          "Type",
          "Category",
          "Case",
          "Customer",
          "Staff",
          "Description",
          "Amount",
          "Method",
          "Status",
          "Created by",
        ]}
      >
        {data.rows.length === 0 ? (
          <tr>
            <td colSpan={11} className="px-3 py-8 text-center text-gray-500">
              No transactions in this period.
            </td>
          </tr>
        ) : (
          data.rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
              <td className="whitespace-nowrap px-3 py-2">
                {r.transactionDate.toISOString().slice(0, 10)}
              </td>
              <td className="px-3 py-2">{r.type.replace(/_/g, " ")}</td>
              <td className="px-3 py-2">{r.category}</td>
              <td className="px-3 py-2">
                {r.case ? (
                  <Link
                    href={`/admin/cases/${r.case.id}`}
                    className="text-teal-700 hover:underline dark:text-teal-300"
                  >
                    {r.case.caseNumber}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-2">{r.client?.name ?? r.client?.email ?? "—"}</td>
              <td className="px-3 py-2">{r.staff?.name ?? r.staff?.email ?? "—"}</td>
              <td className="max-w-[220px] truncate px-3 py-2">{r.description}</td>
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
        Showing {data.rows.length} of {data.total} · page {data.page}/{data.totalPages}
      </p>
    </div>
  );
}

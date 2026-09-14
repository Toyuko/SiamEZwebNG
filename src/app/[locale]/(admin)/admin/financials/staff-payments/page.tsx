import { fetchStaffPaymentsAction } from "@/actions/finance";
import type { DatePreset } from "@/lib/finance/dates";
import { formatCurrency } from "@/lib/utils";
import {
  FinanceKpiCard,
  FinanceTable,
  StatusPill,
  money,
} from "@/components/admin/finance/FinanceUi";
import { FinanceDateFilter } from "@/components/admin/finance/FinanceDateFilter";
import { FinancialsSubnav } from "@/components/admin/finance/FinancialsSubnav";
import { MarkPaidButton } from "@/components/admin/finance/MarkPaidButton";
import { Link } from "@/i18n/navigation";

export default async function FinancialsStaffPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    preset?: string;
    start?: string;
    end?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const preset = (params.preset ?? "this_month") as DatePreset;
  const data = await fetchStaffPaymentsAction({
    preset,
    start: params.start,
    end: params.end,
    status: params.status,
    page: Number(params.page) || 1,
  });
  const { stats, list } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff payments</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Amounts owed or paid to staff and freelancers for case work.
          </p>
        </div>
        <FinanceDateFilter defaultPreset="this_month" />
      </div>

      <FinancialsSubnav current="/admin/financials/staff-payments" />

      <div className="grid gap-4 sm:grid-cols-3">
        <FinanceKpiCard
          label="Unpaid total"
          value={money(stats.unpaidTotal)}
          hint={`${stats.unpaidCount} open`}
          tone={stats.unpaidTotal > 0 ? "warn" : "default"}
        />
        <FinanceKpiCard
          label="Paid this period"
          value={money(stats.paidInRangeTotal)}
          hint={`${stats.paidInRangeCount} payments`}
          tone="positive"
        />
        <FinanceKpiCard
          label="Paid this year"
          value={money(stats.paidYearTotal)}
          hint={`${stats.paidYearCount} payments`}
        />
      </div>

      <form className="flex flex-wrap gap-2">
        <input type="hidden" name="preset" value={preset} />
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
          "Staff",
          "Case",
          "Category",
          "Description",
          "Amount",
          "Status",
          "Actions",
        ]}
      >
        {list.rows.length === 0 ? (
          <tr>
            <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
              No staff payments in this period.
            </td>
          </tr>
        ) : (
          list.rows.map((r) => {
            const canMarkPaid =
              r.paymentStatus === "UNPAID" || r.paymentStatus === "APPROVED";
            return (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                <td className="whitespace-nowrap px-3 py-2">
                  {r.transactionDate.toISOString().slice(0, 10)}
                </td>
                <td className="px-3 py-2">{r.staff?.name ?? r.staff?.email ?? "—"}</td>
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
                <td className="px-3 py-2">{r.category.replace(/_/g, " ")}</td>
                <td className="max-w-[220px] truncate px-3 py-2">{r.description}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                  {formatCurrency(r.amount, r.currency)}
                </td>
                <td className="px-3 py-2">
                  <StatusPill status={r.paymentStatus} />
                </td>
                <td className="px-3 py-2">
                  {canMarkPaid ? <MarkPaidButton id={r.id} /> : "—"}
                </td>
              </tr>
            );
          })
        )}
      </FinanceTable>
      <p className="text-sm text-gray-500">
        Showing {list.rows.length} of {list.total} · page {list.page}/{list.totalPages}
      </p>
    </div>
  );
}

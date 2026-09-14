import {
  fetchFinancialDashboardAction,
  fetchFinancialTransactionsAction,
} from "@/actions/finance";
import type { DatePreset } from "@/lib/finance/dates";
import { resolveDateRange } from "@/lib/finance/dates";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { FinanceKpiCard, FinanceTable, StatusPill, money } from "@/components/admin/finance/FinanceUi";
import { FinanceDateFilter } from "@/components/admin/finance/FinanceDateFilter";
import { FinancialsSubnav } from "@/components/admin/finance/FinancialsSubnav";
import { Link } from "@/i18n/navigation";

export default async function FinancialsRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const preset = (params.preset ?? "this_month") as DatePreset;
  const range = resolveDateRange(preset, params.start, params.end);

  const [dashboard, refunds, payments] = await Promise.all([
    fetchFinancialDashboardAction({
      preset,
      start: params.start,
      end: params.end,
    }),
    fetchFinancialTransactionsAction({
      type: "REFUND",
      preset,
      start: params.start,
      end: params.end,
      page: 1,
    }),
    prisma.payment.findMany({
      where: {
        status: "approved",
        OR: [
          { approvedAt: { gte: range.start, lte: range.end } },
          { approvedAt: null, submittedAt: { gte: range.start, lte: range.end } },
        ],
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            guestName: true,
            guestEmail: true,
            user: { select: { name: true, email: true } },
          },
        },
        invoice: { select: { id: true } },
      },
      orderBy: [{ approvedAt: "desc" }, { submittedAt: "desc" }],
      take: 100,
    }),
  ]);

  const { summary } = dashboard;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Revenue</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Paid customer revenue, refunds, and outstanding receivables for the selected period.
            Payment details live in Payments &amp; Orders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FinanceDateFilter defaultPreset="this_month" />
          <Link
            href="/admin/payments"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            View payments
          </Link>
        </div>
      </div>

      <FinancialsSubnav current="/admin/financials/revenue" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FinanceKpiCard
          label="Paid revenue"
          value={money(summary.revenue)}
          hint="Approved customer payments"
          tone="positive"
        />
        <FinanceKpiCard
          label="Refunds"
          value={money(summary.refunds)}
          tone={summary.refunds > 0 ? "warn" : "default"}
        />
        <FinanceKpiCard
          label="Net revenue"
          value={money(summary.netRevenue)}
          hint="Paid − refunds"
          tone="positive"
        />
        <FinanceKpiCard
          label="Outstanding AR"
          value={money(summary.accountsReceivable)}
          href="/admin/financials/receivables"
          tone={summary.accountsReceivable > 0 ? "warn" : "default"}
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Approved payments
          </h2>
          <Link
            href="/admin/payments?tab=approved"
            className="text-sm text-teal-700 hover:underline dark:text-teal-300"
          >
            Open in Payments
          </Link>
        </div>
        <FinanceTable
          headers={["Date", "Customer", "Case", "Method", "Amount", "Status"]}
        >
          {payments.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                No approved payments in this period.
              </td>
            </tr>
          ) : (
            payments.map((p) => {
              const customer =
                p.case.user?.name ??
                p.case.user?.email ??
                p.case.guestName ??
                p.case.guestEmail ??
                "—";
              const date = (p.approvedAt ?? p.submittedAt).toISOString().slice(0, 10);
              return (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                  <td className="whitespace-nowrap px-3 py-2">{date}</td>
                  <td className="px-3 py-2">{customer}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/cases/${p.case.id}`}
                      className="text-teal-700 hover:underline dark:text-teal-300"
                    >
                      {p.case.caseNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{p.method}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                    {formatCurrency(p.amount, p.currency)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill status={p.status} />
                  </td>
                </tr>
              );
            })
          )}
        </FinanceTable>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Refunds</h2>
        <FinanceTable headers={["Date", "Case", "Description", "Amount", "Status"]}>
          {refunds.rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                No refunds in this period.
              </td>
            </tr>
          ) : (
            refunds.rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                <td className="whitespace-nowrap px-3 py-2">
                  {r.transactionDate.toISOString().slice(0, 10)}
                </td>
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
                <td className="max-w-[280px] truncate px-3 py-2">{r.description}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                  {formatCurrency(r.amount, r.currency)}
                </td>
                <td className="px-3 py-2">
                  <StatusPill status={r.paymentStatus} />
                </td>
              </tr>
            ))
          )}
        </FinanceTable>
      </section>
    </div>
  );
}

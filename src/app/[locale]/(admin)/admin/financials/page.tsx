import { fetchFinancialDashboardAction } from "@/actions/finance";
import { getFinancialDashboardPrefsAction } from "@/actions/finance-analytics";
import type { DatePreset } from "@/lib/finance/dates";
import { FinanceKpiCard, FinanceSection, money } from "@/components/admin/finance/FinanceUi";
import { FinanceDateFilter } from "@/components/admin/finance/FinanceDateFilter";
import { RevenueExpenseChart } from "@/components/admin/finance/RevenueExpenseChart";
import { ExportCsvButton } from "@/components/admin/finance/ExportCsvButton";
import { FinancialsSubnav } from "@/components/admin/finance/FinancialsSubnav";
import { DashboardPrefsPanel } from "@/components/admin/finance/DashboardPrefsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function FinancialsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const prefs = await getFinancialDashboardPrefsAction();
  const preset = (params.preset ?? prefs.defaultPreset ?? "this_month") as DatePreset;
  const data = await fetchFinancialDashboardAction({
    preset,
    start: params.start,
    end: params.end,
  });
  const { summary, series, staffStats } = data;
  const hidden = new Set(prefs.hiddenKpis ?? []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financials</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Track revenue, costs, staff payments, and profitability. All figures are derived from
            transactions — never entered as a single profit number.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FinanceDateFilter defaultPreset={preset} />
          <ExportCsvButton report="pnl" preset={preset} />
          <DashboardPrefsPanel initial={prefs} />
        </div>
      </div>

      <FinancialsSubnav current="/admin/financials" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {!hidden.has("netRevenue") ? (
          <FinanceKpiCard
            label="Revenue"
            value={money(summary.netRevenue)}
            hint="Paid customer revenue − refunds"
            href="/admin/financials/analytics"
            tone="positive"
          />
        ) : null}
        {!hidden.has("grossProfit") ? (
          <FinanceKpiCard
            label="Gross Profit"
            value={money(summary.grossProfit)}
            hint={`Margin ${summary.grossMargin}%`}
            tone={summary.grossProfit >= 0 ? "positive" : "negative"}
          />
        ) : null}
        {!hidden.has("netProfit") ? (
          <FinanceKpiCard
            label="Net Profit"
            value={money(summary.netProfit)}
            hint={`Margin ${summary.netMargin}% · after operating expenses`}
            href="/admin/financials/reports"
            tone={summary.netProfit >= 0 ? "positive" : "negative"}
          />
        ) : null}
        {!hidden.has("operatingExpenses") ? (
          <FinanceKpiCard
            label="Operating Expenses"
            value={money(summary.operatingExpenses)}
            href="/admin/financials/expenses"
          />
        ) : null}
        {!hidden.has("accountsReceivable") ? (
          <FinanceKpiCard
            label="Outstanding Receivables"
            value={money(summary.accountsReceivable)}
            href="/admin/financials/receivables"
            tone={summary.accountsReceivable > 0 ? "warn" : "default"}
          />
        ) : null}
        {!hidden.has("staffCosts") ? (
          <FinanceKpiCard
            label="Unpaid Staff Payments"
            value={money(staffStats.unpaidTotal)}
            hint={`${staffStats.unpaidCount} open`}
            href="/admin/financials/staff-payments"
            tone={staffStats.unpaidTotal > 0 ? "warn" : "default"}
          />
        ) : null}
        <FinanceKpiCard
          label="Accounts Payable"
          value={money(summary.accountsPayable)}
          href="/admin/financials/payables"
        />
        <FinanceKpiCard
          label="Direct Job Costs"
          value={money(summary.directCosts)}
          hint={`Staff ${money(summary.staffCosts)} · Expenses ${money(summary.caseExpenses)}`}
        />
      </div>

      <FinanceSection title="Revenue · Expenses · Profit">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly series</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueExpenseChart series={series} />
          </CardContent>
        </Card>
      </FinanceSection>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profit calculation</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4 border-b border-gray-100 py-1 dark:border-gray-800">
              <dt className="text-gray-500">Paid revenue</dt>
              <dd className="tabular-nums">{money(summary.revenue)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-gray-100 py-1 dark:border-gray-800">
              <dt className="text-gray-500">Refunds</dt>
              <dd className="tabular-nums">−{money(summary.refunds)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-gray-100 py-1 dark:border-gray-800">
              <dt className="text-gray-500">Net revenue</dt>
              <dd className="font-medium tabular-nums">{money(summary.netRevenue)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-gray-100 py-1 dark:border-gray-800">
              <dt className="text-gray-500">Direct costs</dt>
              <dd className="tabular-nums">−{money(summary.directCosts)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-gray-100 py-1 dark:border-gray-800">
              <dt className="text-gray-500">Gross profit</dt>
              <dd className="font-medium tabular-nums">{money(summary.grossProfit)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-gray-100 py-1 dark:border-gray-800">
              <dt className="text-gray-500">Operating expenses</dt>
              <dd className="tabular-nums">−{money(summary.operatingExpenses)}</dd>
            </div>
            <div className="flex justify-between gap-4 py-1 sm:col-span-2">
              <dt className="font-semibold">Net profit</dt>
              <dd className="font-semibold tabular-nums">{money(summary.netProfit)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

import type { DatePreset } from "@/lib/finance/dates";
import { FinanceDateFilter } from "@/components/admin/finance/FinanceDateFilter";
import { FinancialsSubnav } from "@/components/admin/finance/FinancialsSubnav";
import { ExportCsvButton } from "@/components/admin/finance/ExportCsvButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const REPORTS: {
  report:
    | "pnl"
    | "service"
    | "staff"
    | "cases"
    | "receivables"
    | "payables"
    | "expenses";
  title: string;
  description: string;
}[] = [
  {
    report: "pnl",
    title: "Profit & loss",
    description:
      "Period P&L: paid revenue, refunds, net revenue, direct costs, gross profit, operating expenses, and net profit.",
  },
  {
    report: "service",
    title: "Service profitability",
    description: "Jobs, revenue, direct costs, profit, and margin grouped by service.",
  },
  {
    report: "staff",
    title: "Staff profitability",
    description:
      "Revenue share (proportional by assignment), staff cost, other costs, and profit contribution per staff member.",
  },
  {
    report: "cases",
    title: "Case profitability",
    description: "Per-case revenue, staff costs, other costs, profit, and margin.",
  },
  {
    report: "receivables",
    title: "Accounts receivable",
    description: "Open invoice balances with customer, due date, days overdue, and status.",
  },
  {
    report: "payables",
    title: "Accounts payable",
    description: "Unpaid staff payments and vendor expenses with payee, category, and due date.",
  },
  {
    report: "expenses",
    title: "Expenses breakdown",
    description:
      "Operating expenses, case expenses, staff payments, and other cost outflows for the period.",
  },
];

export default async function FinancialsReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const params = await searchParams;
  const preset = (params.preset ?? "this_month") as DatePreset;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Download CSV exports for accounting and analysis. Amounts are in THB.
          </p>
        </div>
        <FinanceDateFilter defaultPreset="this_month" />
      </div>

      <FinancialsSubnav current="/admin/financials/reports" />

      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Card key={r.report}>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
              <CardTitle className="text-base">{r.title}</CardTitle>
              <ExportCsvButton report={r.report} preset={preset} />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">{r.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import { fetchProfitabilityAction } from "@/actions/finance";
import type { DatePreset } from "@/lib/finance/dates";
import { formatCurrency } from "@/lib/utils";
import { FinanceDateFilter } from "@/components/admin/finance/FinanceDateFilter";
import { FinanceSection, FinanceTable } from "@/components/admin/finance/FinanceUi";
import { FinancialsSubnav } from "@/components/admin/finance/FinancialsSubnav";
import { ExportCsvButton } from "@/components/admin/finance/ExportCsvButton";
import { Link } from "@/i18n/navigation";

export default async function FinancialsProfitabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const preset = (params.preset ?? "this_year") as DatePreset;
  const { byService, byStaff, byCase } = await fetchProfitabilityAction({
    preset,
    start: params.start,
    end: params.end,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profitability</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Gross profit by service, staff, and case — derived from payments and costs, never
            entered as a single number.
          </p>
        </div>
        <FinanceDateFilter defaultPreset="this_year" />
      </div>

      <FinancialsSubnav current="/admin/financials/profitability" />

      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
        Staff revenue is a proportional share of assigned cases (split evenly among assignees), not
        full attribution of case revenue to one person.
      </p>

      <FinanceSection
        title="By service"
        actions={<ExportCsvButton report="service" preset={preset} label="Export services" />}
      >
        <FinanceTable
          headers={["Service", "Jobs", "Revenue", "Direct costs", "Profit", "Margin"]}
        >
          {byService.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                No service data in this period.
              </td>
            </tr>
          ) : (
            byService.map((r) => (
              <tr key={r.serviceId} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                <td className="px-3 py-2">{r.serviceName}</td>
                <td className="px-3 py-2 tabular-nums">{r.jobs}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                  {formatCurrency(r.revenue)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                  {formatCurrency(r.directCosts)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums">
                  {formatCurrency(r.profit)}
                </td>
                <td className="px-3 py-2 tabular-nums">{r.margin}%</td>
              </tr>
            ))
          )}
        </FinanceTable>
      </FinanceSection>

      <FinanceSection
        title="By staff"
        actions={<ExportCsvButton report="staff" preset={preset} label="Export staff" />}
      >
        <FinanceTable
          headers={[
            "Staff",
            "Jobs",
            "Revenue (share)",
            "Staff cost",
            "Other costs",
            "Profit contribution",
          ]}
        >
          {byStaff.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                No staff assignment data in this period.
              </td>
            </tr>
          ) : (
            byStaff.map((r) => (
              <tr key={r.staffId} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                <td className="px-3 py-2">{r.staffName}</td>
                <td className="px-3 py-2 tabular-nums">{r.jobs}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                  {formatCurrency(r.revenueGenerated)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                  {formatCurrency(r.staffCost)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                  {formatCurrency(r.otherCosts)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums">
                  {formatCurrency(r.profitContribution)}
                </td>
              </tr>
            ))
          )}
        </FinanceTable>
      </FinanceSection>

      <FinanceSection
        title="By case"
        actions={<ExportCsvButton report="cases" preset={preset} label="Export cases" />}
      >
        <FinanceTable
          headers={[
            "Case",
            "Customer",
            "Service",
            "Status",
            "Revenue",
            "Staff costs",
            "Other costs",
            "Profit",
            "Margin",
          ]}
        >
          {byCase.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                No cases in this period.
              </td>
            </tr>
          ) : (
            byCase.map((r) => (
              <tr key={r.caseId} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/cases/${r.caseId}`}
                    className="text-teal-700 hover:underline dark:text-teal-300"
                  >
                    {r.caseNumber}
                  </Link>
                </td>
                <td className="px-3 py-2">{r.customerName}</td>
                <td className="px-3 py-2">{r.serviceName}</td>
                <td className="px-3 py-2">{r.status.replace(/_/g, " ")}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                  {formatCurrency(r.revenue)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                  {formatCurrency(r.staffCosts)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                  {formatCurrency(r.otherCosts)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums">
                  {formatCurrency(r.profit)}
                </td>
                <td className="px-3 py-2 tabular-nums">{r.margin}%</td>
              </tr>
            ))
          )}
        </FinanceTable>
      </FinanceSection>
    </div>
  );
}

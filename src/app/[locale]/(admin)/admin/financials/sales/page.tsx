import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveDateRange, bangkokDateKey, type DatePreset } from "@/lib/finance/dates";
import {
  aggregateSalespersonTotals,
  canManageSalesAttribution,
  canViewCommission,
  filterDealsByClosedAt,
  filterSalesDeals,
  salesByService,
  summarizeSales,
  type SalesMetric,
  type SalesPaymentStanding,
} from "@/lib/finance/sales";
import {
  countSalesOpportunities,
  getSalesSettings,
  listClosedDealsInRange,
} from "@/data-access/sales-attribution";
import { FinancialsSubnav } from "@/components/admin/finance/FinancialsSubnav";
import { FinanceKpiCard, money } from "@/components/admin/finance/FinanceUi";
import { SalesToolbar } from "@/components/admin/finance/SalesToolbar";
import { Link } from "@/i18n/navigation";

export default async function SalesPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{
    preset?: string;
    start?: string;
    end?: string;
    salesPersonId?: string;
    serviceId?: string;
    status?: string;
    payment?: string;
    method?: string;
    metric?: string;
  }>;
}) {
  const session = await getSession();
  if (!session || (session.user.role !== "admin" && session.user.role !== "staff")) {
    return <p className="text-sm text-red-600">You do not have access to sales performance.</p>;
  }
  const isAdmin = canManageSalesAttribution(session.user.role);
  const params = await searchParams;
  const preset = (params.preset ?? "this_month") as DatePreset;
  const range = resolveDateRange(preset, params.start, params.end);
  const scopedPerson = isAdmin ? params.salesPersonId || null : session.user.id;
  const metric = (params.metric ?? "deals") as SalesMetric;
  const settings = await getSalesSettings();

  const [rawDeals, services, people] = await Promise.all([
    listClosedDealsInRange(range, scopedPerson),
    prisma.service.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { active: true, role: { in: ["admin", "staff"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const deals = filterSalesDeals(filterDealsByClosedAt(rawDeals, range), {
    salesPersonId: scopedPerson,
    serviceId: params.serviceId || null,
    caseStatus: params.status || null,
    paymentStanding: (params.payment || null) as SalesPaymentStanding | null,
    paymentMethod: params.method || null,
  }, settings);

  const visible = deals.map((d) =>
    canViewCommission(session.user, d.salesPersonId)
      ? d
      : { ...d, commissionAmount: 0, commissionStatus: null, commissionType: null }
  );
  const personIds = Array.from(
    new Set(visible.map((d) => d.salesPersonId).filter((id): id is string => !!id))
  );
  const opportunities = await countSalesOpportunities(range, personIds);
  const rows = aggregateSalespersonTotals(visible, opportunities);
  const kpis = summarizeSales(visible);
  const matrix = salesByService(visible, metric);
  const moneyMetric = metric !== "deals";

  function cell(value: number) {
    return moneyMetric ? money(value) : String(value);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales performance</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Deals are counted on the date they were closed ({bangkokDateKey(range.start)} –{" "}
          {bangkokDateKey(range.end)}), not when the service was completed. Closed revenue is the
          deal value. Cash collected is what the customer paid SiamEZ.
        </p>
      </div>
      <FinancialsSubnav current="/admin/financials/sales" />
      <SalesToolbar
        services={services}
        salespeople={people.map((p) => ({ id: p.id, name: p.name ?? p.email }))}
        canManage={isAdmin}
        countCancelledAsSale={settings.countCancelledAsSale}
        requireCloserOnAdminCreate={settings.requireCloserOnAdminCreate}
        lockedSalesPersonId={isAdmin ? null : session.user.id}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <FinanceKpiCard label="Total deals" value={String(kpis.dealsClosed)} hint="Closed in this period" />
        <FinanceKpiCard label="Total sales" value={money(kpis.totalSales)} hint="Deal value" tone="positive" />
        <FinanceKpiCard label="Cash collected" value={money(kpis.cashCollected)} hint="Customer payments − refunds" />
        <FinanceKpiCard label="Outstanding" value={money(kpis.outstanding)} hint="Unpaid deal value" tone={kpis.outstanding > 0 ? "warn" : "default"} />
        <FinanceKpiCard label="Average deal" value={money(kpis.averageDealValue)} />
        <FinanceKpiCard label="Commissions" value={money(kpis.commission)} hint={`Paid ${money(kpis.commissionPaid)} · outstanding ${money(kpis.commissionOutstanding)}`} />
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">By salesperson</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 dark:bg-gray-900/50">
              <tr>
                {["Salesperson", "Deals", "Revenue", "Avg deal", "Paid", "Outstanding", "Refunds", "Commission", "Commission paid", "Conversion"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-gray-500">No closed deals in this period.</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.salesPersonId}>
                    <td className="px-3 py-2 font-medium">
                      {r.salesPersonId === "unassigned" ? (
                        "Unassigned"
                      ) : (
                        <Link href={`/admin/financials/sales/${r.salesPersonId}?preset=${preset}`} className="text-teal-700 hover:underline dark:text-teal-300">
                          {r.salesPersonName}
                        </Link>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.dealsClosed}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(r.revenueClosed)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(r.averageDealValue)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(r.netCollected)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(r.outstandingRevenue)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(r.refunds)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(r.commissionEarned)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(r.commissionPaid)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.conversionRate == null ? "—" : `${r.conversionRate}%`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sales by service</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 dark:bg-gray-900/50">
              <tr>
                <th className="px-3 py-2 font-medium">Salesperson</th>
                {matrix.services.map((s) => (
                  <th key={s.id} className="px-3 py-2 text-right font-medium">{s.name}</th>
                ))}
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {matrix.salespeople.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-gray-500">No service mix in this period.</td>
                </tr>
              ) : (
                matrix.salespeople.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    {matrix.services.map((s) => (
                      <td key={s.id} className="px-3 py-2 text-right tabular-nums">
                        {cell(matrix.cells[p.id]?.[s.id] ?? 0)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{cell(matrix.totals[p.id] ?? 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

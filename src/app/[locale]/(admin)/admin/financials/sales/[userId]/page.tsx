import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bangkokDateKey, resolveDateRange, type DatePreset } from "@/lib/finance/dates";
import {
  canViewCommission,
  canViewSalesperson,
  dealOutstanding,
  filterDealsByClosedAt,
  filterSalesDeals,
  salesVersusTarget,
  summarizeSales,
} from "@/lib/finance/sales";
import { getSalesSettings, getSalesTarget, listClosedDealsInRange } from "@/data-access/sales-attribution";
import { FinancialsSubnav } from "@/components/admin/finance/FinancialsSubnav";
import { FinanceKpiCard, money } from "@/components/admin/finance/FinanceUi";
import { SalesTargetForm } from "@/components/admin/finance/SalesTargetForm";
import { Link } from "@/i18n/navigation";

export default async function SalespersonProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ preset?: string; start?: string; end?: string }>;
}) {
  const session = await getSession();
  const { userId } = await params;
  if (!session || !canViewSalesperson(session.user, userId)) {
    return <p className="text-sm text-red-600">You can only view your own sales performance.</p>;
  }
  const query = await searchParams;
  const preset = (query.preset ?? "this_month") as DatePreset;
  const range = resolveDateRange(preset, query.start, query.end);
  const settings = await getSalesSettings();
  const person = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  if (!person || (person.role !== "admin" && person.role !== "staff")) notFound();

  const deals = filterSalesDeals(
    filterDealsByClosedAt(await listClosedDealsInRange(range, userId), range),
    { salesPersonId: userId },
    settings
  );
  const showCommission = canViewCommission(session.user, userId);
  const kpis = summarizeSales(
    showCommission
      ? deals
      : deals.map((d) => ({ ...d, commissionAmount: 0, commissionStatus: null }))
  );
  const periodKey = bangkokDateKey(range.start).slice(0, 7);
  const target = await getSalesTarget(userId, "monthly", periodKey);
  const versus = salesVersusTarget(kpis.totalSales, target?.targetAmount ?? null);
  const name = person.name ?? person.email;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">
          <Link href="/admin/financials/sales" className="text-teal-700 hover:underline dark:text-teal-300">
            Sales performance
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{name} — sales performance</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          {bangkokDateKey(range.start)} – {bangkokDateKey(range.end)}. Figures follow the close date.
        </p>
      </div>
      <FinancialsSubnav current="/admin/financials/sales" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FinanceKpiCard label="Deals closed" value={String(kpis.dealsClosed)} />
        <FinanceKpiCard label="Total deal value" value={money(kpis.totalSales)} tone="positive" />
        <FinanceKpiCard label="Collected" value={money(kpis.cashCollected)} />
        <FinanceKpiCard label="Outstanding" value={money(kpis.outstanding)} tone={kpis.outstanding > 0 ? "warn" : "default"} />
        <FinanceKpiCard label="Average deal" value={money(kpis.averageDealValue)} />
        {showCommission ? (
          <>
            <FinanceKpiCard label="Commission" value={money(kpis.commission)} />
            <FinanceKpiCard label="Commission paid" value={money(kpis.commissionPaid)} />
            <FinanceKpiCard label="Commission outstanding" value={money(kpis.commissionOutstanding)} />
          </>
        ) : null}
      </div>

      <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h2 className="text-sm font-medium text-gray-500">Monthly target · {periodKey}</h2>
        {versus.target == null ? (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">No target set. Actual sales {money(versus.actual)}.</p>
        ) : (
          <p className="mt-1 text-sm text-gray-800 dark:text-gray-100">
            Actual {money(versus.actual)} · Target {money(versus.target)} · Variance {money(versus.variance ?? 0)}
          </p>
        )}
        {session.user.role === "admin" ? (
          <SalesTargetForm salesPersonId={userId} periodKey={periodKey} />
        ) : null}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Deals</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 dark:bg-gray-900/50">
              <tr>
                {["Date closed", "Customer", "Service", "Deal value", "Amount paid", "Outstanding", "Status", ...(showCommission ? ["Commission", "Commission status"] : [])].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {deals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-gray-500">No deals closed in this period.</td>
                </tr>
              ) : (
                deals.map((d) => (
                  <tr key={d.caseId}>
                    <td className="px-3 py-2">{d.closedAt ? bangkokDateKey(d.closedAt) : "—"}</td>
                    <td className="px-3 py-2">{d.customerName}</td>
                    <td className="px-3 py-2">
                      <Link href={`/admin/cases/${d.caseId}`} className="text-teal-700 hover:underline dark:text-teal-300">
                        {d.serviceName}
                      </Link>
                      <span className="ml-2 text-xs text-gray-400">{d.caseNumber}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(d.dealValue)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(d.paid)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(dealOutstanding(d.dealValue, d.paid))}</td>
                    <td className="px-3 py-2">{d.status.replace(/_/g, " ")}</td>
                    {showCommission ? (
                      <>
                        <td className="px-3 py-2 text-right tabular-nums">{money(d.commissionAmount)}</td>
                        <td className="px-3 py-2">{d.commissionStatus ?? "none"}</td>
                      </>
                    ) : null}
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

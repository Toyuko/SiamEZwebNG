import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bangkokDateKey } from "@/lib/finance/dates";
import { computeCaseFinancialSummary } from "@/lib/finance/calculations";
import { canManageSalesAttribution, canViewCommission, dealOutstanding, SALES_COMMISSION_CATEGORY } from "@/lib/finance/sales";
import { getCaseSalesDetail } from "@/data-access/sales-attribution";
import { CaseSalesPanel } from "@/components/admin/CaseSalesPanel";

export async function CaseSalesPanelServer({ caseId }: { caseId: string }) {
  const session = await getSession();
  if (!session || (session.user.role !== "admin" && session.user.role !== "staff")) return null;
  const detail = await getCaseSalesDetail(caseId);
  if (!detail) return null;

  const [staffUsers, txs, payments, invoices, quotes] = await Promise.all([
    prisma.user.findMany({
      where: { active: true, role: { in: ["admin", "staff"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.financialTransaction.findMany({
      where: { caseId },
      select: { type: true, amount: true, paymentStatus: true, category: true },
    }),
    prisma.payment.findMany({ where: { caseId }, select: { amount: true, status: true } }),
    prisma.invoice.findMany({
      where: { caseId },
      select: { amount: true, status: true, depositAmount: true },
    }),
    prisma.quote.findMany({ where: { caseId }, select: { amount: true, status: true } }),
  ]);

  const summary = computeCaseFinancialSummary({ payments, invoices, quotes, transactions: txs });
  const commissionCost = txs
    .filter(
      (t) =>
        t.category === SALES_COMMISSION_CATEGORY &&
        t.paymentStatus !== "CANCELLED" &&
        (t.type === "CASE_EXPENSE" || t.type === "OTHER_EXPENSE")
    )
    .reduce((s, t) => s + t.amount, 0);
  const otherCosts = Math.max(0, summary.otherDirectCosts - commissionCost);
  const deal = detail.deal;
  const showCommission = canViewCommission(session.user, deal.salesPersonId);

  return (
    <CaseSalesPanel
      caseId={caseId}
      canManage={canManageSalesAttribution(session.user.role)}
      canSeeCommission={showCommission}
      salespersonId={deal.salesPersonId}
      salespersonName={deal.salesPersonName ?? "Unassigned"}
      closedAt={detail.closedAt ? bangkokDateKey(detail.closedAt) : null}
      dealValueSatang={deal.dealValue}
      salesNotes={detail.salesNotes}
      staffNames={deal.staffNames}
      paidSatang={summary.paidRevenue}
      outstandingSatang={dealOutstanding(deal.dealValue, summary.paidRevenue)}
      staffCostSatang={summary.staffCosts}
      otherCostSatang={showCommission ? otherCosts : summary.otherDirectCosts}
      profitSatang={summary.grossProfit}
      commissionType={showCommission ? deal.commissionType : null}
      commissionStatus={showCommission ? deal.commissionStatus : null}
      commissionSatang={showCommission ? deal.commissionAmount : 0}
      ratePercent={showCommission ? detail.commissionRatePercent : null}
      staffUsers={staffUsers}
      audits={
        canManageSalesAttribution(session.user.role)
          ? detail.audits.map((a) => ({
              id: a.id,
              reason: a.reason,
              createdAt: a.createdAt.toISOString(),
              previousName: a.previousSalesPerson?.name ?? a.previousSalesPerson?.email ?? "Unassigned",
              nextName: a.newSalesPerson?.name ?? a.newSalesPerson?.email ?? "Unassigned",
              changedByName: a.changedBy?.name ?? a.changedBy?.email ?? "Unknown",
            }))
          : []
      }
    />
  );
}

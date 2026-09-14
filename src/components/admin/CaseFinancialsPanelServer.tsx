import {
  fetchCaseFinancialSummaryAction,
  fetchCaseFinancialTransactionsAction,
  getStaffUsersForFinanceAction,
} from "@/actions/finance";
import { prisma } from "@/lib/db";
import { CaseFinancialsPanel } from "@/components/admin/CaseFinancialsPanel";

/**
 * Thin server wrapper: loads case financial summary, ledger rows, and staff users,
 * then renders the client CaseFinancialsPanel.
 */
export async function CaseFinancialsPanelServer({ caseId }: { caseId: string }) {
  const [summary, transactions, staffUsers, assignments] = await Promise.all([
    fetchCaseFinancialSummaryAction(caseId),
    fetchCaseFinancialTransactionsAction(caseId),
    getStaffUsersForFinanceAction(),
    prisma.staffAssignment.findMany({
      where: { caseId },
      select: { userId: true },
    }),
  ]);

  if (!summary) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Unable to load financial summary for this case.
      </p>
    );
  }

  return (
    <CaseFinancialsPanel
      caseId={caseId}
      summary={summary}
      transactions={transactions}
      staffUsers={staffUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
      }))}
      assignedStaffIds={assignments.map((a) => a.userId)}
    />
  );
}

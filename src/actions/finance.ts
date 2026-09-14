"use server";

import { revalidatePath } from "next/cache";
import type {
  FinancialPaymentMethod,
  FinancialPaymentStatus,
  FinancialTransactionType,
} from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { assertNonNegativeAmount, bahtToSatang } from "@/lib/finance/money";
import {
  resolveDateRange,
  type DatePreset,
} from "@/lib/finance/dates";
import {
  getCaseFinancialSummary,
  getFinancialSummary,
  getMonthlyFinancialSeries,
  getServiceProfitability,
  getStaffProfitability,
  getCaseProfitability,
  listReceivables,
  listPayables,
  getAccountsPayableTotal,
} from "@/lib/finance/summaries";
import {
  cancelFinancialTransaction,
  createFinancialTransaction,
  getFinancialTransactionsByCaseId,
  getStaffPaymentStats,
  listFinancialTransactions,
  markFinancialTransactionPaid,
  updateFinancialTransaction,
} from "@/data-access/financial";
import { prisma } from "@/lib/db";
import { toCsv, satangToCsvBaht } from "@/lib/finance/csv";

async function requireFinanceAccess() {
  return requireStaff();
}

async function assertCanAccessCaseFinance(caseId: string) {
  const session = await requireStaff();
  if (session.user.role === "admin" || session.user.role === "staff") {
    // Staff can manage case financials from admin UI (same as invoices/payments).
    // Customers/freelancers never reach here (requireStaff).
    void caseId;
    return session;
  }
  throw new Error("Forbidden");
}

function parseAmountSatang(amountBaht: number | string): number {
  const n = typeof amountBaht === "string" ? Number(amountBaht) : amountBaht;
  if (!Number.isFinite(n)) throw new Error("Invalid amount");
  const satang = bahtToSatang(n);
  assertNonNegativeAmount(satang);
  return satang;
}

export async function fetchCaseFinancialSummaryAction(caseId: string) {
  await assertCanAccessCaseFinance(caseId);
  return getCaseFinancialSummary(caseId);
}

export async function fetchCaseFinancialTransactionsAction(caseId: string) {
  await assertCanAccessCaseFinance(caseId);
  return getFinancialTransactionsByCaseId(caseId);
}

export async function createCaseStaffPaymentAction(input: {
  caseId: string;
  staffId: string;
  amountBaht: number | string;
  category: string;
  description: string;
  paymentMethod?: FinancialPaymentMethod | null;
  paymentStatus?: FinancialPaymentStatus;
  transactionDate?: string;
  notes?: string;
  reference?: string;
}) {
  const session = await assertCanAccessCaseFinance(input.caseId);
  const amount = parseAmountSatang(input.amountBaht);
  const caseRow = await prisma.case.findUnique({
    where: { id: input.caseId },
    select: { serviceId: true, userId: true },
  });
  if (!caseRow) throw new Error("Case not found");

  const row = await createFinancialTransaction(
    {
      caseId: input.caseId,
      staffId: input.staffId,
      serviceId: caseRow.serviceId,
      clientId: caseRow.userId,
      type: "STAFF_PAYMENT",
      category: input.category || "service_handling",
      description: input.description || "Staff payment",
      amount,
      paymentMethod: input.paymentMethod ?? null,
      paymentStatus: input.paymentStatus ?? "UNPAID",
      transactionDate: input.transactionDate
        ? new Date(input.transactionDate)
        : new Date(),
      notes: input.notes,
      reference: input.reference,
      createdById: session.user.id,
      paidAt: input.paymentStatus === "PAID" ? new Date() : null,
    },
    session.user.id
  );

  revalidatePath(`/admin/cases/${input.caseId}`);
  revalidatePath("/admin/financials");
  return { ok: true as const, id: row.id };
}

export async function createCaseExpenseAction(input: {
  caseId: string;
  amountBaht: number | string;
  category: string;
  description: string;
  vendor?: string;
  paymentMethod?: FinancialPaymentMethod | null;
  paymentStatus?: FinancialPaymentStatus;
  transactionDate?: string;
  notes?: string;
  reference?: string;
  receiptDocumentId?: string;
}) {
  const session = await assertCanAccessCaseFinance(input.caseId);
  const amount = parseAmountSatang(input.amountBaht);
  const caseRow = await prisma.case.findUnique({
    where: { id: input.caseId },
    select: { serviceId: true, userId: true },
  });
  if (!caseRow) throw new Error("Case not found");

  const row = await createFinancialTransaction(
    {
      caseId: input.caseId,
      serviceId: caseRow.serviceId,
      clientId: caseRow.userId,
      type: "CASE_EXPENSE",
      category: input.category || "other",
      description: input.description || "Case expense",
      amount,
      vendor: input.vendor,
      paymentMethod: input.paymentMethod ?? null,
      paymentStatus: input.paymentStatus ?? "PAID",
      transactionDate: input.transactionDate
        ? new Date(input.transactionDate)
        : new Date(),
      notes: input.notes,
      reference: input.reference,
      receiptDocumentId: input.receiptDocumentId,
      createdById: session.user.id,
      paidAt: (input.paymentStatus ?? "PAID") === "PAID" ? new Date() : null,
    },
    session.user.id
  );

  revalidatePath(`/admin/cases/${input.caseId}`);
  revalidatePath("/admin/financials");
  return { ok: true as const, id: row.id };
}

export async function createCaseRefundAction(input: {
  caseId: string;
  amountBaht: number | string;
  description: string;
  relatedPaymentId?: string;
  paymentMethod?: FinancialPaymentMethod | null;
  transactionDate?: string;
  notes?: string;
}) {
  const session = await assertCanAccessCaseFinance(input.caseId);
  const amount = parseAmountSatang(input.amountBaht);
  const caseRow = await prisma.case.findUnique({
    where: { id: input.caseId },
    select: { serviceId: true, userId: true },
  });
  if (!caseRow) throw new Error("Case not found");

  const row = await createFinancialTransaction(
    {
      caseId: input.caseId,
      serviceId: caseRow.serviceId,
      clientId: caseRow.userId,
      type: "REFUND",
      category: "refund",
      description: input.description || "Customer refund",
      amount,
      paymentMethod: input.paymentMethod ?? null,
      paymentStatus: "PAID",
      transactionDate: input.transactionDate
        ? new Date(input.transactionDate)
        : new Date(),
      notes: input.notes,
      relatedPaymentId: input.relatedPaymentId,
      createdById: session.user.id,
      paidAt: new Date(),
    },
    session.user.id
  );

  revalidatePath(`/admin/cases/${input.caseId}`);
  revalidatePath("/admin/financials");
  return { ok: true as const, id: row.id };
}

export async function createOperatingExpenseAction(input: {
  amountBaht: number | string;
  category: string;
  description: string;
  vendor?: string;
  paymentMethod?: FinancialPaymentMethod | null;
  paymentStatus?: FinancialPaymentStatus;
  transactionDate?: string;
  notes?: string;
  reference?: string;
  isRecurring?: boolean;
  receiptDocumentId?: string;
}) {
  const session = await requireFinanceAccess();
  const amount = parseAmountSatang(input.amountBaht);

  const row = await createFinancialTransaction(
    {
      type: "OPERATING_EXPENSE",
      category: input.category || "miscellaneous",
      description: input.description || "Operating expense",
      amount,
      vendor: input.vendor,
      paymentMethod: input.paymentMethod ?? null,
      paymentStatus: input.paymentStatus ?? "PAID",
      transactionDate: input.transactionDate
        ? new Date(input.transactionDate)
        : new Date(),
      notes: input.notes,
      reference: input.reference,
      isRecurring: input.isRecurring ?? false,
      receiptDocumentId: input.receiptDocumentId,
      createdById: session.user.id,
      paidAt: (input.paymentStatus ?? "PAID") === "PAID" ? new Date() : null,
    },
    session.user.id
  );

  revalidatePath("/admin/financials");
  revalidatePath("/admin/financials/expenses");
  return { ok: true as const, id: row.id };
}

export async function markStaffPaymentPaidAction(id: string) {
  const session = await requireFinanceAccess();
  await markFinancialTransactionPaid(id, session.user.id);
  revalidatePath("/admin/financials/staff-payments");
  revalidatePath("/admin/financials/payables");
  revalidatePath("/admin/financials");
  return { ok: true as const };
}

export async function cancelFinancialTransactionAction(id: string) {
  const session = await requireFinanceAccess();
  await cancelFinancialTransaction(id, session.user.id);
  revalidatePath("/admin/financials");
  return { ok: true as const };
}

export async function updateFinancialTransactionStatusAction(
  id: string,
  paymentStatus: FinancialPaymentStatus
) {
  const session = await requireFinanceAccess();
  await updateFinancialTransaction(
    id,
    {
      paymentStatus,
      ...(paymentStatus === "PAID" ? { paidAt: new Date() } : {}),
      ...(paymentStatus === "CANCELLED"
        ? { cancelledAt: new Date(), cancelledById: session.user.id }
        : {}),
    },
    session.user.id
  );
  revalidatePath("/admin/financials");
  return { ok: true as const };
}

export async function fetchFinancialDashboardAction(input: {
  preset?: DatePreset;
  start?: string;
  end?: string;
}) {
  await requireFinanceAccess();
  const range = resolveDateRange(
    input.preset ?? "this_month",
    input.start,
    input.end
  );
  const [summary, series, staffStats, payableTotal] = await Promise.all([
    getFinancialSummary(range),
    getMonthlyFinancialSeries(range),
    getStaffPaymentStats(range),
    getAccountsPayableTotal(),
  ]);
  return { range, summary, series, staffStats, payableTotal };
}

export async function fetchFinancialTransactionsAction(filters: {
  type?: string;
  status?: string;
  staffId?: string;
  serviceId?: string;
  caseId?: string;
  q?: string;
  preset?: DatePreset;
  start?: string;
  end?: string;
  page?: number;
}) {
  await requireFinanceAccess();
  const range =
    filters.preset || filters.start
      ? resolveDateRange(filters.preset ?? "custom", filters.start, filters.end)
      : null;

  return listFinancialTransactions({
    type: filters.type as FinancialTransactionType | undefined,
    paymentStatus: filters.status as FinancialPaymentStatus | undefined,
    staffId: filters.staffId,
    serviceId: filters.serviceId,
    caseId: filters.caseId,
    q: filters.q,
    startDate: range?.start,
    endDate: range?.end,
    page: filters.page ?? 1,
  });
}

export async function fetchStaffPaymentsAction(filters: {
  staffId?: string;
  status?: string;
  serviceId?: string;
  caseId?: string;
  q?: string;
  preset?: DatePreset;
  start?: string;
  end?: string;
  page?: number;
}) {
  await requireFinanceAccess();
  const range = resolveDateRange(
    filters.preset ?? "this_month",
    filters.start,
    filters.end
  );
  const [stats, list] = await Promise.all([
    getStaffPaymentStats(range),
    listFinancialTransactions({
      type: "STAFF_PAYMENT",
      paymentStatus: filters.status as FinancialPaymentStatus | undefined,
      staffId: filters.staffId,
      serviceId: filters.serviceId,
      caseId: filters.caseId,
      q: filters.q,
      startDate: range.start,
      endDate: range.end,
      page: filters.page ?? 1,
    }),
  ]);
  return { stats, list, range };
}

export async function fetchReceivablesAction() {
  await requireFinanceAccess();
  return listReceivables();
}

export async function fetchPayablesAction(status?: string) {
  await requireFinanceAccess();
  return listPayables({ status });
}

export async function fetchProfitabilityAction(input: {
  preset?: DatePreset;
  start?: string;
  end?: string;
}) {
  await requireFinanceAccess();
  const range = resolveDateRange(
    input.preset ?? "this_year",
    input.start,
    input.end
  );
  const [byService, byStaff, byCase] = await Promise.all([
    getServiceProfitability(range),
    getStaffProfitability(range),
    getCaseProfitability(range),
  ]);
  return { range, byService, byStaff, byCase };
}

export async function exportFinancialReportCsvAction(input: {
  report:
    | "pnl"
    | "service"
    | "staff"
    | "cases"
    | "receivables"
    | "payables"
    | "expenses";
  preset?: DatePreset;
  start?: string;
  end?: string;
}): Promise<{ filename: string; csv: string }> {
  await requireFinanceAccess();
  const range = resolveDateRange(
    input.preset ?? "this_month",
    input.start,
    input.end
  );

  if (input.report === "pnl") {
    const s = await getFinancialSummary(range);
    const csv = toCsv(
      ["Metric", "Amount (THB)"],
      [
        ["Revenue", satangToCsvBaht(s.revenue)],
        ["Refunds", satangToCsvBaht(s.refunds)],
        ["Net Revenue", satangToCsvBaht(s.netRevenue)],
        ["Direct Costs", satangToCsvBaht(s.directCosts)],
        ["Gross Profit", satangToCsvBaht(s.grossProfit)],
        ["Gross Margin %", s.grossMargin],
        ["Operating Expenses", satangToCsvBaht(s.operatingExpenses)],
        ["Net Profit", satangToCsvBaht(s.netProfit)],
        ["Net Margin %", s.netMargin],
      ]
    );
    return { filename: "siamez-pnl.csv", csv };
  }

  if (input.report === "service") {
    const rows = await getServiceProfitability(range);
    const csv = toCsv(
      ["Service", "Jobs", "Revenue", "Direct Costs", "Profit", "Margin %"],
      rows.map((r) => [
        r.serviceName,
        r.jobs,
        satangToCsvBaht(r.revenue),
        satangToCsvBaht(r.directCosts),
        satangToCsvBaht(r.profit),
        r.margin,
      ])
    );
    return { filename: "siamez-service-profitability.csv", csv };
  }

  if (input.report === "staff") {
    const rows = await getStaffProfitability(range);
    const csv = toCsv(
      [
        "Staff",
        "Jobs",
        "Revenue Generated",
        "Staff Cost",
        "Other Costs",
        "Profit Contribution",
      ],
      rows.map((r) => [
        r.staffName,
        r.jobs,
        satangToCsvBaht(r.revenueGenerated),
        satangToCsvBaht(r.staffCost),
        satangToCsvBaht(r.otherCosts),
        satangToCsvBaht(r.profitContribution),
      ])
    );
    return { filename: "siamez-staff-profitability.csv", csv };
  }

  if (input.report === "cases") {
    const rows = await getCaseProfitability(range);
    const csv = toCsv(
      [
        "Case",
        "Customer",
        "Service",
        "Status",
        "Revenue",
        "Staff Costs",
        "Other Costs",
        "Profit",
        "Margin %",
      ],
      rows.map((r) => [
        r.caseNumber,
        r.customerName,
        r.serviceName,
        r.status,
        satangToCsvBaht(r.revenue),
        satangToCsvBaht(r.staffCosts),
        satangToCsvBaht(r.otherCosts),
        satangToCsvBaht(r.profit),
        r.margin,
      ])
    );
    return { filename: "siamez-case-profitability.csv", csv };
  }

  if (input.report === "receivables") {
    const rows = await listReceivables();
    const csv = toCsv(
      [
        "Customer",
        "Case",
        "Invoice",
        "Total",
        "Paid",
        "Outstanding",
        "Due Date",
        "Days Overdue",
        "Status",
      ],
      rows.map((r) => [
        r.customerName,
        r.caseNumber,
        r.invoiceId,
        satangToCsvBaht(r.total),
        satangToCsvBaht(r.paid),
        satangToCsvBaht(r.outstanding),
        r.dueDate?.toISOString().slice(0, 10) ?? "",
        r.daysOverdue,
        r.status,
      ])
    );
    return { filename: "siamez-receivables.csv", csv };
  }

  if (input.report === "payables") {
    const rows = await listPayables();
    const csv = toCsv(
      ["Payee", "Case", "Category", "Type", "Amount", "Due Date", "Status"],
      rows.map((r) => [
        r.payee,
        r.caseNumber ?? "",
        r.category,
        r.type,
        satangToCsvBaht(r.amount),
        r.dueDate?.toISOString().slice(0, 10) ?? "",
        r.status,
      ])
    );
    return { filename: "siamez-payables.csv", csv };
  }

  // expenses breakdown
  const txs = await listFinancialTransactions({
    type: ["OPERATING_EXPENSE", "CASE_EXPENSE", "OTHER_EXPENSE", "STAFF_PAYMENT"],
    startDate: range.start,
    endDate: range.end,
    pageSize: 5000,
  });
  const csv = toCsv(
    ["Date", "Type", "Category", "Description", "Amount", "Status", "Case"],
    txs.rows.map((r) => [
      r.transactionDate.toISOString().slice(0, 10),
      r.type,
      r.category,
      r.description,
      satangToCsvBaht(r.amount),
      r.paymentStatus,
      r.case?.caseNumber ?? "",
    ])
  );
  return { filename: "siamez-expenses.csv", csv };
}

export async function getStaffUsersForFinanceAction() {
  await requireStaff();
  return prisma.user.findMany({
    where: { role: { in: ["admin", "staff", "freelancer"] }, active: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
}

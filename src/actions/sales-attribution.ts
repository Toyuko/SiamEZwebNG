"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { bahtToSatang } from "@/lib/finance/money";
import { resolveDateRange, type DatePreset } from "@/lib/finance/dates";
import { satangToCsvBaht, toCsv } from "@/lib/finance/csv";
import { toXlsx } from "@/lib/finance/xlsx";
import {
  buildSalesExportRows,
  canManageSalesAttribution,
  canViewCommission,
  canViewSalesperson,
  filterDealsByClosedAt,
  filterSalesDeals,
  type SalesCommissionType,
  type SalesPaymentStanding,
  type SalesQueryFilters,
} from "@/lib/finance/sales";
import {
  assignCaseSalesPerson,
  getSalesSettings,
  listClosedDealsInRange,
  saveSalesSettings,
  upsertCaseCommission,
  upsertSalesTarget,
} from "@/data-access/sales-attribution";

async function requireSalesViewer() {
  const session = await getSession();
  if (!session || (session.user.role !== "admin" && session.user.role !== "staff")) {
    throw new Error("Forbidden");
  }
  return session;
}

function assertAdmin(role: string) {
  if (!canManageSalesAttribution(role)) {
    throw new Error("Only administrators can change sales attribution");
  }
}

export async function assignCaseSalesPersonAction(input: {
  caseId: string;
  salesPersonId: string;
  reason?: string;
  closedAt?: string;
  dealValueBaht?: string;
  salesNotes?: string;
}) {
  const session = await requireSalesViewer();
  assertAdmin(session.user.role);
  const closedAt = input.closedAt ? new Date(`${input.closedAt}T12:00:00+07:00`) : null;
  const dealValue =
    input.dealValueBaht != null && input.dealValueBaht !== ""
      ? bahtToSatang(Number(input.dealValueBaht))
      : null;
  await assignCaseSalesPerson({
    caseId: input.caseId,
    salesPersonId: input.salesPersonId,
    changedById: session.user.id,
    reason: input.reason,
    closedAt,
    dealValue,
    salesNotes: input.salesNotes,
    isNew: false,
  });
  revalidatePath("/admin/financials/sales");
  revalidatePath(`/admin/cases/${input.caseId}`);
}

export async function updateCaseCommissionAction(input: {
  caseId: string;
  type: SalesCommissionType;
  ratePercent?: string;
  amountBaht?: string;
  status?: "pending" | "approved" | "paid" | "cancelled";
  notes?: string;
}) {
  const session = await requireSalesViewer();
  assertAdmin(session.user.role);
  const rate = input.ratePercent != null && input.ratePercent !== "" ? Number(input.ratePercent) : null;
  const amount =
    input.amountBaht != null && input.amountBaht !== "" ? bahtToSatang(Number(input.amountBaht)) : null;
  await upsertCaseCommission({
    caseId: input.caseId,
    type: input.type,
    ratePercent: rate,
    fixedAmount: input.type === "fixed" ? amount : null,
    customAmount: input.type === "custom" ? amount : null,
    status: input.status,
    notes: input.notes,
    actorId: session.user.id,
  });
  revalidatePath("/admin/financials/sales");
  revalidatePath(`/admin/cases/${input.caseId}`);
}

export async function updateSalesSettingsAction(input: {
  countCancelledAsSale: boolean;
  requireCloserOnAdminCreate: boolean;
}) {
  const session = await requireSalesViewer();
  assertAdmin(session.user.role);
  await saveSalesSettings({
    countCancelledAsSale: input.countCancelledAsSale,
    requireCloserOnAdminCreate: input.requireCloserOnAdminCreate,
  });
  revalidatePath("/admin/financials/sales");
}

export async function saveSalesTargetAction(input: {
  salesPersonId: string;
  periodKey: string;
  targetBaht: string;
}) {
  const session = await requireSalesViewer();
  assertAdmin(session.user.role);
  await upsertSalesTarget({
    salesPersonId: input.salesPersonId,
    period: "monthly",
    periodKey: input.periodKey,
    targetAmount: bahtToSatang(Number(input.targetBaht)),
  });
  revalidatePath(`/admin/financials/sales/${input.salesPersonId}`);
}

export async function exportSalesReportAction(input: {
  preset?: DatePreset;
  start?: string;
  end?: string;
  salesPersonId?: string;
  serviceId?: string;
  caseStatus?: string;
  paymentStanding?: SalesPaymentStanding | "";
  paymentMethod?: string;
  format: "csv" | "xlsx";
}) {
  const session = await requireSalesViewer();
  const settings = await getSalesSettings();
  const range = resolveDateRange(input.preset ?? "this_month", input.start, input.end);
  const scopedPerson =
    session.user.role === "admin" ? input.salesPersonId || null : session.user.id;
  if (scopedPerson && !canViewSalesperson(session.user, scopedPerson)) {
    throw new Error("Forbidden");
  }
  const filters: SalesQueryFilters = {
    salesPersonId: scopedPerson,
    serviceId: input.serviceId || null,
    caseStatus: input.caseStatus || null,
    paymentStanding: input.paymentStanding || null,
    paymentMethod: input.paymentMethod || null,
  };
  const deals = filterSalesDeals(
    filterDealsByClosedAt(await listClosedDealsInRange(range, scopedPerson), range),
    filters,
    settings
  );
  const visible = deals.map((d) =>
    canViewCommission(session.user, d.salesPersonId)
      ? d
      : { ...d, commissionAmount: 0, commissionStatus: null, commissionType: null }
  );
  const rows = buildSalesExportRows(visible, filters, settings, range);
  const headers = [
    "Salesperson",
    "Deal ID",
    "Customer",
    "Service",
    "Closed Date",
    "Deal Value",
    "Paid Amount",
    "Outstanding",
    "Commission",
    "Commission Status",
    "Job Status",
  ];
  const table = rows.map((r) => [
    r.salesperson,
    r.dealId,
    r.customer,
    r.service,
    r.closedDate.slice(0, 10),
    satangToCsvBaht(r.dealValue),
    satangToCsvBaht(r.paidAmount),
    satangToCsvBaht(r.outstanding),
    satangToCsvBaht(r.commission),
    r.commissionStatus,
    r.jobStatus,
  ]);
  if (input.format === "xlsx") {
    const buffer = toXlsx(headers, table);
    return {
      filename: "siamez-sales-performance.xlsx",
      base64: buffer.toString("base64"),
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }
  return {
    filename: "siamez-sales-performance.csv",
    base64: Buffer.from(toCsv(headers, table), "utf8").toString("base64"),
    mime: "text/csv",
  };
}

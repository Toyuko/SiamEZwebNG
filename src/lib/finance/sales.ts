/**
 * Sales attribution — who closed the deal, separate from who performed the service
 * and separate from who received the customer's payment.
 *
 * Amounts are satang integers. Commission rates use integer basis points
 * (10% = 1000) derived from a Decimal percent so money math never uses floats.
 * Reports attribute deals by closedAt, never by service completion.
 */

import type { DateRange } from "./dates";
import { assertNonNegativeAmount, roundMargin, sumSatang, type MoneySatang } from "./money";

export const SALES_COMMISSION_CATEGORY = "sales_commission";

export const SALES_SETTINGS_KEY = "sales_attribution";

export type SalesCommissionType =
  | "none"
  | "fixed"
  | "percent_of_deal"
  | "percent_of_collected"
  | "custom";

export type SalesCommissionStatus = "pending" | "approved" | "paid" | "cancelled";

export type SalesMetric =
  | "deals"
  | "dealValue"
  | "collected"
  | "averageDeal";

export type SalesPaymentStanding = "unpaid" | "partial" | "paid" | "refunded";

export type SalesSettings = {
  /** Cancelled jobs count as closed sales only when an admin turns this on. */
  countCancelledAsSale: boolean;
  /** Admin-created service jobs require a closer. Public self-serve bookings stay unassigned. */
  requireCloserOnAdminCreate: boolean;
};

export const DEFAULT_SALES_SETTINGS: SalesSettings = {
  countCancelledAsSale: false,
  requireCloserOnAdminCreate: true,
};

export type StaffUserRef = {
  id: string;
  role: string;
  active: boolean;
};

export type SalesDeal = {
  caseId: string;
  caseNumber: string;
  customerName: string;
  clientId: string | null;
  serviceId: string;
  serviceName: string;
  status: string;
  salesPersonId: string | null;
  salesPersonName: string | null;
  /** Service delivery staff. Never used as the deal closer. */
  staffIds: string[];
  staffNames: string[];
  /** Service-staff compensation (STAFF_PAYMENT). Not sales commission. */
  staffCompensation: MoneySatang;
  closedAt: Date | null;
  dealValue: MoneySatang;
  /** Approved customer payments to SiamEZ. Not money the salesperson received. */
  paid: MoneySatang;
  refunds: MoneySatang;
  commissionAmount: MoneySatang;
  commissionStatus: SalesCommissionStatus | null;
  commissionType: SalesCommissionType | null;
  paymentMethod: string | null;
};

export type SalespersonTotals = {
  salesPersonId: string;
  salesPersonName: string;
  dealsClosed: number;
  revenueClosed: MoneySatang;
  averageDealValue: MoneySatang;
  paidRevenue: MoneySatang;
  netCollected: MoneySatang;
  outstandingRevenue: MoneySatang;
  refunds: MoneySatang;
  commissionEarned: MoneySatang;
  commissionPaid: MoneySatang;
  commissionOutstanding: MoneySatang;
  /** Null when no quotes/leads exist to measure against. */
  conversionRate: number | null;
  opportunities: number;
};

export type SalesKpis = {
  dealsClosed: number;
  totalSales: MoneySatang;
  cashCollected: MoneySatang;
  outstanding: MoneySatang;
  averageDealValue: MoneySatang;
  commission: MoneySatang;
  commissionPaid: MoneySatang;
  commissionOutstanding: MoneySatang;
  refunds: MoneySatang;
};

export type SalesServiceMatrix = {
  salespeople: { id: string; name: string }[];
  services: { id: string; name: string }[];
  /** cells[salespersonId][serviceId] */
  cells: Record<string, Record<string, number>>;
  totals: Record<string, number>;
};

export type AttributionChange = {
  previousSalesPersonId: string | null;
  newSalesPersonId: string | null;
  changedById: string;
  reason: string;
  at: Date;
};

const ACTIVE_COMMISSION: SalesCommissionStatus[] = ["pending", "approved", "paid"];

export function parseSalesSettings(value: unknown): SalesSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_SALES_SETTINGS };
  const v = value as Partial<SalesSettings>;
  return {
    countCancelledAsSale: v.countCancelledAsSale === true,
    requireCloserOnAdminCreate: v.requireCloserOnAdminCreate !== false,
  };
}

/** Salesperson must be an existing active admin or staff user. Never free text. */
export function assertEligibleSalesperson(user: StaffUserRef | null | undefined): void {
  if (!user || !user.active) {
    throw new Error("Salesperson must be an existing active staff user");
  }
  if (user.role !== "admin" && user.role !== "staff") {
    throw new Error("Salesperson must be an existing active staff user");
  }
}

export function countsAsClosedSale(status: string, settings: SalesSettings): boolean {
  if (status === "cancelled") return settings.countCancelledAsSale;
  return true;
}

export function dealOutstanding(dealValue: MoneySatang, paid: MoneySatang): MoneySatang {
  return Math.max(0, dealValue - paid);
}

/** Cash SiamEZ actually kept after refunds. Unpaid invoices are not collected. */
export function netCollected(paid: MoneySatang, refunds: MoneySatang): MoneySatang {
  return Math.max(0, paid - refunds);
}

export function commissionPaidAmount(deal: Pick<SalesDeal, "commissionAmount" | "commissionStatus">): MoneySatang {
  if (deal.commissionStatus !== "paid") return 0;
  return deal.commissionAmount;
}

export function commissionEarnedAmount(
  deal: Pick<SalesDeal, "commissionAmount" | "commissionStatus">
): MoneySatang {
  if (!deal.commissionStatus || !ACTIVE_COMMISSION.includes(deal.commissionStatus)) return 0;
  return deal.commissionAmount;
}

export function commissionOutstandingAmount(
  deal: Pick<SalesDeal, "commissionAmount" | "commissionStatus">
): MoneySatang {
  const earned = commissionEarnedAmount(deal);
  return Math.max(0, earned - commissionPaidAmount(deal));
}

export function salesPaymentStanding(deal: Pick<SalesDeal, "status" | "dealValue" | "paid" | "refunds">): SalesPaymentStanding {
  if (deal.status === "refunded" || (deal.refunds > 0 && deal.refunds >= deal.paid && deal.paid > 0)) {
    return "refunded";
  }
  if (deal.paid <= 0) return "unpaid";
  if (deal.paid < deal.dealValue) return "partial";
  return "paid";
}

/**
 * Percent → basis points (10.5% = 1050). Amount = round(basis * bps / 10_000).
 */
export function percentToBasisPoints(percent: number): number {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new Error("Commission rate must be between 0 and 100");
  }
  return Math.round(percent * 100);
}

export function applyPercentSatang(basisSatang: MoneySatang, ratePercent: number): MoneySatang {
  const bps = percentToBasisPoints(ratePercent);
  return Math.round((basisSatang * bps) / 10_000);
}

export function computeCommissionSatang(input: {
  type: SalesCommissionType;
  dealValue: MoneySatang;
  paid: MoneySatang;
  refunds: MoneySatang;
  ratePercent?: number | null;
  fixedAmount?: MoneySatang | null;
  customAmount?: MoneySatang | null;
}): MoneySatang {
  if (input.type === "none") return 0;
  if (input.type === "fixed") {
    const amount = input.fixedAmount ?? 0;
    assertNonNegativeAmount(amount, "commission");
    return amount;
  }
  if (input.type === "custom") {
    const amount = input.customAmount ?? 0;
    assertNonNegativeAmount(amount, "commission");
    return amount;
  }
  const rate = input.ratePercent ?? 0;
  if (input.type === "percent_of_deal") {
    return applyPercentSatang(input.dealValue, rate);
  }
  const collected = netCollected(input.paid, input.refunds);
  return applyPercentSatang(collected, rate);
}

export function resolveDealValue(input: {
  explicit: number | null | undefined;
  invoiced: number;
  quoted: number;
  servicePrice: number | null | undefined;
}): MoneySatang {
  if (input.explicit != null) {
    assertNonNegativeAmount(input.explicit, "deal value");
    return input.explicit;
  }
  if (input.invoiced > 0) return input.invoiced;
  if (input.quoted > 0) return input.quoted;
  if (input.servicePrice != null && input.servicePrice > 0) return input.servicePrice;
  return 0;
}

/**
 * Keep an existing close date unless the admin supplies a new one.
 * New jobs default to now. Existing unassigned jobs require an explicit date
 * so historical months are not invented.
 */
export function resolveClosedAt(input: {
  existingClosedAt: Date | null;
  providedClosedAt: Date | null;
  isNew: boolean;
  now: Date;
}): Date {
  if (input.providedClosedAt) return input.providedClosedAt;
  if (input.existingClosedAt) return input.existingClosedAt;
  if (input.isNew) return input.now;
  throw new Error("Closed date is required when assigning a salesperson to an existing job");
}

export function planAttributionChange(input: {
  previousSalesPersonId: string | null;
  newSalesPersonId: string | null;
  changedById: string;
  reason: string | null | undefined;
  now?: Date;
}): AttributionChange | null {
  if (input.previousSalesPersonId === input.newSalesPersonId) return null;
  const reason = (input.reason ?? "").trim();
  if (input.previousSalesPersonId && !reason) {
    throw new Error("A reason is required when changing the salesperson");
  }
  return {
    previousSalesPersonId: input.previousSalesPersonId,
    newSalesPersonId: input.newSalesPersonId,
    changedById: input.changedById,
    reason: reason || "Initial assignment",
    at: input.now ?? new Date(),
  };
}

export function canViewSalesperson(
  viewer: { id: string; role: string },
  salesPersonId: string
): boolean {
  if (viewer.role === "admin") return true;
  if (viewer.role === "staff") return viewer.id === salesPersonId;
  return false;
}

export function canManageSalesAttribution(role: string): boolean {
  return role === "admin";
}

export function canViewCommission(
  viewer: { id: string; role: string },
  salesPersonId: string | null
): boolean {
  if (viewer.role === "admin") return true;
  if (!salesPersonId) return false;
  return viewer.role === "staff" && viewer.id === salesPersonId;
}

/** Deals in range by closedAt. Completion date is ignored. */
export function filterDealsByClosedAt(deals: SalesDeal[], range: DateRange): SalesDeal[] {
  return deals.filter((d) => {
    if (!d.closedAt) return false;
    return d.closedAt.getTime() >= range.start.getTime() && d.closedAt.getTime() <= range.end.getTime();
  });
}

export type SalesQueryFilters = {
  salesPersonId?: string | null;
  serviceId?: string | null;
  caseStatus?: string | null;
  paymentStanding?: SalesPaymentStanding | null;
  paymentMethod?: string | null;
};

export function filterSalesDeals(
  deals: SalesDeal[],
  filters: SalesQueryFilters,
  settings: SalesSettings
): SalesDeal[] {
  return deals.filter((d) => {
    if (!d.salesPersonId && !d.closedAt) return false;
    if (!countsAsClosedSale(d.status, settings)) return false;
    if (filters.salesPersonId && d.salesPersonId !== filters.salesPersonId) return false;
    if (filters.serviceId && d.serviceId !== filters.serviceId) return false;
    if (filters.caseStatus && d.status !== filters.caseStatus) return false;
    if (filters.paymentMethod && d.paymentMethod !== filters.paymentMethod) return false;
    if (filters.paymentStanding && salesPaymentStanding(d) !== filters.paymentStanding) return false;
    return true;
  });
}

function emptyTotals(id: string, name: string): SalespersonTotals {
  return {
    salesPersonId: id,
    salesPersonName: name,
    dealsClosed: 0,
    revenueClosed: 0,
    averageDealValue: 0,
    paidRevenue: 0,
    netCollected: 0,
    outstandingRevenue: 0,
    refunds: 0,
    commissionEarned: 0,
    commissionPaid: 0,
    commissionOutstanding: 0,
    conversionRate: null,
    opportunities: 0,
  };
}

export function aggregateSalespersonTotals(
  deals: SalesDeal[],
  opportunitiesByPerson: Record<string, number> = {}
): SalespersonTotals[] {
  const map = new Map<string, SalespersonTotals>();
  for (const d of deals) {
    const id = d.salesPersonId ?? "unassigned";
    const name = d.salesPersonName ?? "Unassigned";
    let row = map.get(id);
    if (!row) {
      row = emptyTotals(id, name);
      map.set(id, row);
    }
    row.dealsClosed += 1;
    row.revenueClosed += d.dealValue;
    row.paidRevenue += d.paid;
    row.netCollected += netCollected(d.paid, d.refunds);
    row.outstandingRevenue += dealOutstanding(d.dealValue, d.paid);
    row.refunds += d.refunds;
    row.commissionEarned += commissionEarnedAmount(d);
    row.commissionPaid += commissionPaidAmount(d);
    row.commissionOutstanding += commissionOutstandingAmount(d);
  }
  for (const row of map.values()) {
    row.averageDealValue =
      row.dealsClosed > 0 ? Math.round(row.revenueClosed / row.dealsClosed) : 0;
    const opportunities = opportunitiesByPerson[row.salesPersonId] ?? 0;
    row.opportunities = opportunities;
    row.conversionRate =
      opportunities > 0 ? roundMargin((row.dealsClosed / opportunities) * 100) : null;
  }
  return Array.from(map.values()).sort((a, b) => a.salesPersonName.localeCompare(b.salesPersonName));
}

export function summarizeSales(deals: SalesDeal[]): SalesKpis {
  const rows = aggregateSalespersonTotals(deals);
  const dealsClosed = sumSatang(rows.map((r) => r.dealsClosed));
  const totalSales = sumSatang(rows.map((r) => r.revenueClosed));
  return {
    dealsClosed,
    totalSales,
    cashCollected: sumSatang(rows.map((r) => r.netCollected)),
    outstanding: sumSatang(rows.map((r) => r.outstandingRevenue)),
    averageDealValue: dealsClosed > 0 ? Math.round(totalSales / dealsClosed) : 0,
    commission: sumSatang(rows.map((r) => r.commissionEarned)),
    commissionPaid: sumSatang(rows.map((r) => r.commissionPaid)),
    commissionOutstanding: sumSatang(rows.map((r) => r.commissionOutstanding)),
    refunds: sumSatang(rows.map((r) => r.refunds)),
  };
}

export function salesByService(deals: SalesDeal[], metric: SalesMetric): SalesServiceMatrix {
  const people = new Map<string, string>();
  const services = new Map<string, string>();
  const cells: Record<string, Record<string, { deals: number; dealValue: number; collected: number }>> = {};

  for (const d of deals) {
    const pid = d.salesPersonId ?? "unassigned";
    const pname = d.salesPersonName ?? "Unassigned";
    people.set(pid, pname);
    services.set(d.serviceId, d.serviceName);
    cells[pid] ??= {};
    cells[pid][d.serviceId] ??= { deals: 0, dealValue: 0, collected: 0 };
    const cell = cells[pid][d.serviceId];
    cell.deals += 1;
    cell.dealValue += d.dealValue;
    cell.collected += netCollected(d.paid, d.refunds);
  }

  const valueOf = (cell: { deals: number; dealValue: number; collected: number }) => {
    if (metric === "deals") return cell.deals;
    if (metric === "dealValue") return cell.dealValue;
    if (metric === "collected") return cell.collected;
    return cell.deals > 0 ? Math.round(cell.dealValue / cell.deals) : 0;
  };

  const out: Record<string, Record<string, number>> = {};
  const totals: Record<string, number> = {};
  for (const [pid, byService] of Object.entries(cells)) {
    out[pid] = {};
    let runningDeals = 0;
    let runningValue = 0;
    let runningCollected = 0;
    for (const [sid, cell] of Object.entries(byService)) {
      out[pid][sid] = valueOf(cell);
      runningDeals += cell.deals;
      runningValue += cell.dealValue;
      runningCollected += cell.collected;
    }
    if (metric === "deals") totals[pid] = runningDeals;
    else if (metric === "dealValue") totals[pid] = runningValue;
    else if (metric === "collected") totals[pid] = runningCollected;
    else totals[pid] = runningDeals > 0 ? Math.round(runningValue / runningDeals) : 0;
  }

  return {
    salespeople: Array.from(people.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    services: Array.from(services.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    cells: out,
    totals,
  };
}

export type SalesExportRow = {
  salesperson: string;
  dealId: string;
  customer: string;
  service: string;
  closedDate: string;
  dealValue: MoneySatang;
  paidAmount: MoneySatang;
  outstanding: MoneySatang;
  commission: MoneySatang;
  commissionStatus: string;
  jobStatus: string;
};

export function buildSalesExportRows(
  deals: SalesDeal[],
  filters: SalesQueryFilters,
  settings: SalesSettings,
  range: DateRange
): SalesExportRow[] {
  const rows = filterSalesDeals(filterDealsByClosedAt(deals, range), filters, settings);
  return rows
    .slice()
    .sort((a, b) => (a.closedAt?.getTime() ?? 0) - (b.closedAt?.getTime() ?? 0))
    .map((d) => ({
      salesperson: d.salesPersonName ?? "Unassigned",
      dealId: d.caseNumber,
      customer: d.customerName,
      service: d.serviceName,
      closedDate: d.closedAt ? d.closedAt.toISOString() : "",
      dealValue: d.dealValue,
      paidAmount: d.paid,
      outstanding: dealOutstanding(d.dealValue, d.paid),
      commission: commissionEarnedAmount(d),
      commissionStatus: d.commissionStatus ?? "none",
      jobStatus: d.status,
    }));
}

/** Actual vs target. No rank or score. */
export function salesVersusTarget(actual: MoneySatang, target: MoneySatang | null): {
  actual: MoneySatang;
  target: MoneySatang | null;
  variance: MoneySatang | null;
} {
  if (target == null) return { actual, target: null, variance: null };
  return { actual, target, variance: actual - target };
}

export function displaySalespersonName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed : "Unassigned";
}

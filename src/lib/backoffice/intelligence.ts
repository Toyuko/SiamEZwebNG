import { prisma } from "@/lib/db";
import { dateKeyFromParts, formatSatang } from "@/lib/backoffice/format";
import { canViewManagementFinancials } from "@/lib/backoffice/permissions";
import type { BackofficeRole } from "@/lib/backoffice/types";
import { bangkokDateKey, endOfBangkokDay, startOfBangkokDay } from "@/lib/finance/dates";
import { listReceivables } from "@/lib/finance/summaries";
import { addCalendarDays, addCalendarMonths, daysInMonth, todayInBangkok, toUtcDateOnly } from "@/lib/follow-ups/dates";

const COST_TYPES = ["STAFF_PAYMENT", "CASE_EXPENSE", "OPERATING_EXPENSE", "OTHER_EXPENSE"] as const;
const OPEN_TASK = ["PENDING", "DUE", "IN_PROGRESS"] as const;
const CLOSED_CASE = ["completed", "cancelled", "refunded"] as const;

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

export type NamedRange = { start: Date; end: Date; label: string };

export function namedMonthRange(text: string, now: Date = new Date()): NamedRange | null {
  const lower = text.toLowerCase();
  const found = Object.keys(MONTHS).find((name) => lower.includes(name));
  if (!found) return null;
  const month = MONTHS[found]!;
  const explicit = text.match(/\b(20\d{2})\b/);
  const today = todayInBangkok(now);
  let year = explicit ? Number(explicit[1]) : today.year;
  if (!explicit && month > today.month) year -= 1;
  const startKey = dateKeyFromParts({ year, month, day: 1 });
  const endKey = dateKeyFromParts({ year, month, day: daysInMonth(year, month) });
  return {
    start: startOfBangkokDay(startKey),
    end: endOfBangkokDay(endKey),
    label: `${found.slice(0, 1).toUpperCase()}${found.slice(1)} ${year}`,
  };
}

export function monthRange(offset: number, now: Date = new Date()): NamedRange {
  const shifted = addCalendarMonths({ ...todayInBangkok(now), day: 1 }, offset);
  const startKey = dateKeyFromParts({ ...shifted, day: 1 });
  const endKey = dateKeyFromParts({ ...shifted, day: daysInMonth(shifted.year, shifted.month) });
  const label = offset === 0 ? "this month" : offset === -1 ? "last month" : startKey.slice(0, 7);
  return { start: startOfBangkokDay(startKey), end: endOfBangkokDay(endKey), label };
}

export function rankByAmount(rows: { name: string; amount: number }[]): { name: string; amount: number }[] {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.name, (totals.get(row.name) ?? 0) + row.amount);
  return [...totals.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
}

export type ProfitInput = {
  role: BackofficeRole;
  label: string;
  revenueSatang: number;
  costSatang: number;
  costCount: number;
  commissionSatang: number;
  commissionCount: number;
};

export function describeProfit(input: ProfitInput): { title: string; lines: string[] } {
  if (!canViewManagementFinancials(input.role)) {
    return {
      title: "Company profit, margins, and operating costs are limited to administrators.",
      lines: ["I did not include a figure.", "Ask an administrator if you need that report."],
    };
  }
  const lines = [`Approved revenue for ${input.label}: ${formatSatang(input.revenueSatang)}. This is money collected, not profit.`];
  if (input.costCount === 0 && input.commissionCount === 0) {
    lines.push("Profit cannot be calculated. This period has no operating-cost transactions and no paid commission separate from those costs.");
    return { title: `Revenue for ${input.label}. Profit is not available.`, lines };
  }
  const result = input.revenueSatang - input.costSatang - input.commissionSatang;
  lines.push(`Recorded costs: ${formatSatang(input.costSatang)} across ${input.costCount} transactions.`);
  lines.push(`Paid commission not already posted as a cost: ${formatSatang(input.commissionSatang)} across ${input.commissionCount} rows.`);
  lines.push(`Recorded result, revenue minus those amounts: ${formatSatang(result)}.`);
  lines.push("Only stored cost and commission rows are used.");
  return { title: `Recorded result for ${input.label}.`, lines };
}

export type ChartBar = { label: string; value: number; display: string };
export type Bottleneck = { problem: string; count: number; age: string; area: string; action: string };

function ageLabel(oldest: Date | null, now: Date): string {
  if (!oldest) return "no start date was stored";
  const days = Math.max(0, Math.floor((now.getTime() - oldest.getTime()) / 86_400_000));
  if (days === 0) return "since today";
  if (days === 1) return "for 1 day";
  return `for ${days} days`;
}

async function approvedRevenue(range: NamedRange): Promise<{ total: number; ranked: { name: string; amount: number }[] }> {
  const payments = await prisma.payment.findMany({
    where: { status: "approved", approvedAt: { gte: range.start, lte: range.end } },
    select: { amount: true, case: { select: { service: { select: { name: true } }, otherServiceName: true } } },
  });
  const ranked = rankByAmount(
    payments.map((payment) => ({
      name: payment.case.service?.name ?? payment.case.otherServiceName ?? "Unspecified service",
      amount: payment.amount,
    }))
  );
  return { total: payments.reduce((sum, payment) => sum + payment.amount, 0), ranked };
}

export async function profitReport(role: BackofficeRole, now: Date = new Date()): Promise<{ title: string; lines: string[] }> {
  if (!canViewManagementFinancials(role)) {
    return describeProfit({ role, label: "this month", revenueSatang: 0, costSatang: 0, costCount: 0, commissionSatang: 0, commissionCount: 0 });
  }
  const range = monthRange(0, now);
  const [revenue, costs, commissions] = await Promise.all([
    approvedRevenue(range),
    prisma.financialTransaction.findMany({
      where: { type: { in: [...COST_TYPES] }, paymentStatus: { not: "CANCELLED" }, transactionDate: { gte: range.start, lte: range.end } },
      select: { amount: true },
    }),
    prisma.salesCommission.findMany({
      where: { status: "paid", financialTransactionId: null, paidAt: { gte: range.start, lte: range.end } },
      select: { amount: true },
    }),
  ]);
  return describeProfit({
    role,
    label: range.label,
    revenueSatang: revenue.total,
    costSatang: costs.reduce((sum, row) => sum + row.amount, 0),
    costCount: costs.length,
    commissionSatang: commissions.reduce((sum, row) => sum + row.amount, 0),
    commissionCount: commissions.length,
  });
}

export async function revenueRanking(text: string, now: Date = new Date()): Promise<{ title: string; lines: string[] }> {
  const range = namedMonthRange(text, now) ?? monthRange(/\blast month\b/i.test(text) ? -1 : 0, now);
  const revenue = await approvedRevenue(range);
  const lines = [`Approved collections for ${range.label}: ${formatSatang(revenue.total)}.`, "This is recorded revenue, not profit."];
  if (revenue.ranked.length === 0) lines.push("No approved payments were recorded in that period.");
  else lines.push(...revenue.ranked.slice(0, 8).map((row, index) => `${index + 1}. ${row.name}: ${formatSatang(row.amount)}`));
  const top = revenue.ranked[0];
  if (top) lines.push(`Recommendation: ${top.name} is the highest recorded collection in ${range.label}. That ranking uses payments already approved.`);
  return { title: `Services by recorded revenue for ${range.label}.`, lines };
}

type StaffLoad = { name: string; overdue: number; open: number };

async function staffLoads(): Promise<StaffLoad[]> {
  const today = toUtcDateOnly(todayInBangkok());
  const rows = await prisma.followUp.findMany({
    where: { status: { in: [...OPEN_TASK] } },
    select: { assignedStaffId: true, dueDate: true, assignedStaff: { select: { name: true, email: true } } },
    take: 500,
  });
  const grouped = new Map<string, StaffLoad>();
  for (const row of rows) {
    const key = row.assignedStaffId ?? "unassigned";
    const current = grouped.get(key) ?? {
      name: row.assignedStaff?.name || row.assignedStaff?.email || "Unassigned",
      overdue: 0,
      open: 0,
    };
    current.open += 1;
    if (row.dueDate < today) current.overdue += 1;
    grouped.set(key, current);
  }
  return [...grouped.values()].sort((a, b) => b.overdue - a.overdue || b.open - a.open || a.name.localeCompare(b.name));
}

export async function staffWorkload(): Promise<{ title: string; lines: string[] }> {
  const loads = await staffLoads();
  const overdue = loads.filter((row) => row.overdue > 0);
  if (overdue.length === 0) return { title: "No staff member has an overdue task.", lines: ["Open follow-ups were checked against today's date in Asia/Bangkok."] };
  const busiest = overdue[0]!;
  return {
    title: "Staff with outstanding tasks.",
    lines: [
      ...overdue.slice(0, 10).map((row) => `${row.name}: ${row.overdue} overdue, ${row.open} still open.`),
      `Recommendation: ${busiest.name} has the most overdue work. Reassign the oldest items if someone else has fewer open tasks.`,
    ],
  };
}

export async function serviceDemand(now: Date = new Date()): Promise<{ title: string; lines: string[] }> {
  const range = monthRange(0, now);
  const rows = await prisma.case.findMany({
    where: { createdAt: { gte: range.start, lte: range.end } },
    select: { service: { select: { name: true } }, otherServiceName: true },
    take: 500,
  });
  const ranked = rankByAmount(rows.map((row) => ({ name: row.service?.name ?? row.otherServiceName ?? "Unspecified service", amount: 1 })));
  if (ranked.length === 0) return { title: "No bookings were created this month.", lines: ["There is no popularity ranking to show."] };
  return {
    title: "Services customers booked this month.",
    lines: ranked.slice(0, 8).map((row, index) => `${index + 1}. ${row.name}: ${row.amount} booking${row.amount === 1 ? "" : "s"}`),
  };
}

export async function customersNotContacted(now: Date = new Date()): Promise<{ title: string; lines: string[] }> {
  const since = new Date(now.getTime() - 7 * 86_400_000);
  const rows = await prisma.case.findMany({
    where: { status: { notIn: [...CLOSED_CASE] }, updatedAt: { lt: since } },
    orderBy: { updatedAt: "asc" },
    take: 15,
    select: { caseNumber: true, updatedAt: true, guestName: true, service: { select: { name: true } }, user: { select: { name: true, email: true } } },
  });
  if (rows.length === 0) return { title: "No open booking has gone seven days without an update.", lines: [] };
  return {
    title: "Customers whose bookings have not been updated for seven days.",
    lines: rows.map((row) => {
      const name = row.user?.name || row.guestName || row.user?.email || "Unknown customer";
      const days = Math.floor((now.getTime() - row.updatedAt.getTime()) / 86_400_000);
      return `${row.caseNumber} · ${name} · ${row.service?.name ?? "service"} · last update ${days} days ago`;
    }),
  };
}

export async function detectBottlenecks(now: Date = new Date()): Promise<Bottleneck[]> {
  const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
  const [unconfirmed, staleQuotes, receivables, loads] = await Promise.all([
    prisma.case.findMany({
      where: { status: { in: ["new", "under_review"] }, createdAt: { lt: twoDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
    prisma.quote.count({ where: { status: { in: ["sent", "viewed"] }, updatedAt: { lt: sevenDaysAgo } } }),
    listReceivables(),
    staffLoads(),
  ]);
  const latePayments = receivables.filter((row) => row.outstanding > 0 && row.daysOverdue > 7);
  const found: Bottleneck[] = [];
  if (unconfirmed.length > 0) {
    found.push({
      problem: "Bookings are still unconfirmed.",
      count: unconfirmed.length,
      age: ageLabel(unconfirmed[0]?.createdAt ?? null, now),
      area: "Bookings",
      action: "Confirm or contact the oldest unconfirmed bookings.",
    });
  }
  if (staleQuotes > 0) {
    found.push({
      problem: "Quotations are waiting on a customer response.",
      count: staleQuotes,
      age: "for more than 7 days",
      area: "Quotations",
      action: "Follow up quotations that are still sent or viewed.",
    });
  }
  if (latePayments.length > 0) {
    found.push({
      problem: "Customer payments are past their due date.",
      count: latePayments.length,
      age: `the oldest is ${Math.max(...latePayments.map((row) => row.daysOverdue))} days overdue`,
      area: "Finance",
      action: "Prepare payment reminders and confirm before sending them.",
    });
  }
  const overloaded = loads.filter((row) => row.overdue >= 5);
  if (overloaded[0]) {
    found.push({
      problem: "A staff member has a large overdue workload.",
      count: overloaded.length,
      age: `${overloaded[0].name} has ${overloaded[0].overdue} overdue tasks`,
      area: "Staff",
      action: "Move some of those follow-ups to someone with fewer open tasks.",
    });
  }
  return found;
}

export async function buildBriefing(role: BackofficeRole, now: Date = new Date()): Promise<{
  title: string;
  lines: string[];
  bottlenecks: Bottleneck[];
  charts: { title: string; bars: ChartBar[] }[];
  priorities: string[];
}> {
  const todayKey = bangkokDateKey(now);
  const today = { start: startOfBangkokDay(todayKey), end: endOfBangkokDay(todayKey), label: "today" };
  const current = monthRange(0, now);
  const previous = monthRange(-1, now);
  const [todayRevenue, currentRevenue, previousRevenue, bottlenecks, loads, newBookings, pendingBookings, outstanding] = await Promise.all([
    approvedRevenue(today),
    approvedRevenue(current),
    approvedRevenue(previous),
    detectBottlenecks(now),
    staffLoads(),
    prisma.case.count({ where: { createdAt: { gte: today.start, lte: today.end } } }),
    prisma.case.count({ where: { status: { in: ["new", "under_review"] } } }),
    listReceivables(),
  ]);
  const due = outstanding.filter((row) => row.outstanding > 0);
  const overdueTasks = loads.reduce((sum, row) => sum + row.overdue, 0);
  const lines = [
    `Today in Asia/Bangkok: ${newBookings} new booking${newBookings === 1 ? "" : "s"}, ${pendingBookings} still unconfirmed.`,
    `Revenue collected today: ${formatSatang(todayRevenue.total)}.`,
    `Outstanding customer balances: ${formatSatang(due.reduce((sum, row) => sum + row.outstanding, 0))} across ${due.length} invoices.`,
    `Open staff tasks that are overdue: ${overdueTasks}.`,
  ];
  if (canViewManagementFinancials(role)) lines.push(...(await profitReport(role, now)).lines);
  else lines.push(`Approved revenue ${current.label}: ${formatSatang(currentRevenue.total)}. Profit is not included for this role.`);
  return {
    title: "Management briefing",
    lines,
    bottlenecks,
    charts: [
      {
        title: "Approved revenue",
        bars: [
          { label: previous.label, value: previousRevenue.total, display: formatSatang(previousRevenue.total) },
          { label: current.label, value: currentRevenue.total, display: formatSatang(currentRevenue.total) },
          { label: "Today", value: todayRevenue.total, display: formatSatang(todayRevenue.total) },
        ],
      },
      {
        title: "Overdue tasks by staff",
        bars: loads.filter((row) => row.overdue > 0).slice(0, 6).map((row) => ({ label: row.name, value: row.overdue, display: String(row.overdue) })),
      },
    ],
    priorities: [
      pendingBookings > 0 ? `Confirm ${pendingBookings} unconfirmed bookings.` : "No unconfirmed bookings are waiting.",
      due.length > 0 ? `Review ${due.length} outstanding invoices before sending reminders.` : "No outstanding invoices were found.",
      overdueTasks > 0 ? `Clear ${overdueTasks} overdue staff tasks or reassign them.` : "No overdue staff tasks were found.",
    ],
  };
}

export function tomorrowKey(now: Date = new Date()): string {
  return dateKeyFromParts(addCalendarDays(todayInBangkok(now), 1));
}

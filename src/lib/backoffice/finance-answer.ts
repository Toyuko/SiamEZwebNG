import { formatSatang } from "@/lib/backoffice/format";
import type { BackofficeIntent } from "@/lib/backoffice/intent";
import type { AssistantFact, BackofficeRole } from "@/lib/backoffice/types";
import {
  bangkokMonthRange,
  deliveryPaymentsWithoutCredit,
  findStaffForRevenue,
  getRevenueByDateRange,
  getRevenueComparison,
} from "@/lib/finance/collected-query";
import { bangkokDateKey, resolveDateRange, type DateRange } from "@/lib/finance/dates";
import { bangkokYearRange, type FinanceStatement } from "@/lib/finance/collected";
import { canViewManagementFinancials } from "@/lib/backoffice/permissions";
import { canViewSalesperson } from "@/lib/finance/sales";
import { monthlyCollected, serviceProfit, summariseCommissions, summariseDeals, sumExpenses } from "@/lib/finance/picture";
import { getAttributedBookings, getBusinessExpenses, getClosedDeals, getStaffCommissions } from "@/lib/finance/collected-query";

const RULES = [
  "Included: approved customer payments, dated by approval time. If approval time is missing, the submission time is used. Manual ledger income is listed separately and is not a copy of those payments.",
  "Excluded: submitted, rejected, unpaid, and pending amounts, quotations, and booking prices. A deposit and a later balance are each counted once, for the amount received.",
  "Refunds are subtracted only in net collected. They are not added to revenue.",
  "Dates use Asia/Bangkok.",
].join(" ");

function fact(title: string, lines: string[], links: AssistantFact["links"] = []): AssistantFact {
  return { title, lines, links };
}

function presetRange(period: "today" | "week" | "this_month" | "last_month" | "this_year", now: Date): DateRange & { label: string } {
  const preset = period === "week" ? "this_week" : period;
  const range = resolveDateRange(preset, null, null, now);
  const label = `${bangkokDateKey(range.start)} to ${bangkokDateKey(range.end)}`;
  return { ...range, label };
}

function intentRange(
  intent: Extract<BackofficeIntent, { kind: "revenue" | "revenue_by_service" }>,
  now: Date
): DateRange & { label: string } {
  if (intent.period === "named" && intent.month && intent.year) return bangkokMonthRange(intent.year, intent.month);
  if (intent.period === "year" && intent.year) return bangkokYearRange(intent.year);
  if (intent.period === "all") {
    return { start: new Date(0), end: now, label: `all stored history through ${bangkokDateKey(now)}` };
  }
  if (intent.period === "today" || intent.period === "week" || intent.period === "last_month" || intent.period === "this_year") {
    return presetRange(intent.period, now);
  }
  return presetRange("this_month", now);
}

function money(amount: number): string {
  return formatSatang(amount);
}

function describe(statement: FinanceStatement & { auditNote?: string }, label: string, who: string | null): string[] {
  const payments = statement.lines.filter((line) => line.kind === "payment");
  const shown = payments.slice(0, 20);
  const lines = [
    `Period: ${label}, Asia/Bangkok.`,
    `Metric: approved customer payments${who ? ` attributed to ${who} as the deal closer` : ""}.`,
    `Approved payments: ${money(statement.collectedSatang)}.`,
    `Manual ledger income: ${money(statement.ledgerIncomeSatang)}.`,
    `Total collected: ${money(statement.grossCollectedSatang)}.`,
    `Refunds: ${money(statement.refundSatang)} across ${statement.refundCount} refund${statement.refundCount === 1 ? "" : "s"}.`,
    `Net collected: ${money(statement.netCollectedSatang)}.`,
    `Qualifying payments: ${statement.paymentCount}.`,
    "audit" in statement && typeof statement.auditNote === "string" ? statement.auditNote : "",
    RULES,
  ];
  if (who) {
    lines.push("Service-delivery assignments are not this person's revenue. Only the booking's recorded deal closer is used.");
  } else if (statement.unattributedCount > 0) {
    lines.push(`${statement.unattributedCount} approved payment${statement.unattributedCount === 1 ? "" : "s"} in this result ha${statement.unattributedCount === 1 ? "s" : "ve"} no deal closer. They stay in the company total and in nobody's personal total.`);
  }
  if (shown.length === 0) lines.push("No qualifying payment was recorded in this period.");
  else {
    lines.push("Transactions:");
    for (const line of shown) {
      const when = bangkokDateKey(line.at);
      lines.push(`${when} · ${line.customerName} · ${line.caseNumber ?? "no booking"} · ${line.serviceName} · ${money(line.amount)} · ${line.status} · ${line.staffName ?? "no deal closer"}`);
    }
    if (payments.length > shown.length) {
      lines.push(`Showing ${shown.length} of ${payments.length} payments. The totals include every qualifying payment.`);
    }
  }
  if (statement.issues.length > 0) lines.push(...statement.issues.slice(0, 8));
  return lines;
}

function linksFor(statement: FinanceStatement): AssistantFact["links"] {
  const seen = new Set<string>();
  const links: AssistantFact["links"] = [];
  for (const line of statement.lines) {
    if (!line.caseId || !line.caseNumber || seen.has(line.caseId)) continue;
    seen.add(line.caseId);
    links.push({ href: `/admin/cases/${line.caseId}`, label: line.caseNumber });
    if (links.length >= 8) break;
  }
  return links;
}

async function staffScope(
  name: string,
  role: BackofficeRole,
  actorId: string | null
): Promise<{ id: string; label: string } | AssistantFact> {
  const resolved = await findStaffForRevenue(name);
  if (resolved.status === "incomplete") {
    return fact("The staff list could not be read completely.", [
      "I did not guess which person you meant, and I did not substitute the company total.",
    ]);
  }
  if (resolved.status === "none") {
    return fact(`No staff record matches ${name}.`, [
      "I did not substitute the company total.",
      "Revenue is attributed only when a booking records that person as the deal closer.",
    ]);
  }
  if (resolved.status === "ambiguous") {
    const labels = resolved.people.map((person) => person.name || person.email);
    return fact(`More than one staff record matches ${name}.`, [
      "I did not choose one or invent a total.",
      ...labels.map((label) => label),
      "Ask again with the full name.",
    ]);
  }
  const person = resolved.person;
  if (!canViewSalesperson({ id: actorId ?? "", role }, person.id)) {
    return fact("That person's revenue is limited to administrators and to that person.", [
      "I did not substitute the company total.",
    ]);
  }
  const label = person.name || person.email;
  return { id: person.id, label: person.active ? label : `${label} (inactive record)` };
}

export async function explainRevenue(
  intent: Extract<BackofficeIntent, { kind: "revenue" | "revenue_by_service" | "revenue_compare" }>,
  role: BackofficeRole,
  actorId: string | null,
  now: Date = new Date()
): Promise<AssistantFact> {
  try {
    if (intent.kind === "revenue" && (intent.focus === "expenses" || intent.focus === "cashflow" || intent.focus === "profit_services") && !canViewManagementFinancials(role)) {
      return fact("Expenses, cash flow, and service profit are limited to administrators.", ["I did not include a figure."]);
    }
    if (intent.kind === "revenue" && intent.focus === "commission" && role !== "admin" && !intent.staffName) {
      return fact("A ranking of every employee's commission is limited to administrators.", ["I did not include a figure."]);
    }
    if (intent.kind === "revenue" && intent.focus === "by_staff" && role !== "admin") {
      return fact("A ranking of every staff member's revenue is limited to administrators.", [
        "I did not substitute one person's figure or the company total.",
      ]);
    }
    if (intent.kind === "revenue_compare") {
      let salesPersonId: string | undefined;
      let who: string | null = null;
      if (intent.staffName) {
        const scope = await staffScope(intent.staffName, role, actorId);
        if ("title" in scope) return scope;
        salesPersonId = scope.id;
        who = scope.label;
      }
      const left = bangkokMonthRange(intent.leftYear, intent.leftMonth);
      const right = bangkokMonthRange(intent.rightYear, intent.rightMonth);
      const compared = await getRevenueComparison(left, right, { salesPersonId });
      if (!compared.complete) {
        return fact("The comparison could not be read completely.", [compared.left.auditNote, compared.right.auditNote, "I am not showing a total."]);
      }
      const delta = compared.deltaSatang;
      return fact(`${who ? `${who} — ` : ""}${left.label} compared with ${right.label}.`, [
        `Metric: money collected. This is not deal value and not commission.`,
        `${left.label}: ${money(compared.left.grossCollectedSatang)} from ${compared.left.paymentCount} approved payments.`,
        `${right.label}: ${money(compared.right.grossCollectedSatang)} from ${compared.right.paymentCount} approved payments.`,
        `Difference, first period minus second: ${delta >= 0 ? "+" : "−"}${money(Math.abs(delta))}.`,
        compared.left.auditNote,
        RULES,
      ]);
    }
    if (intent.period === "compare") {
      const current = presetRange("this_month", now);
      const previous = presetRange("last_month", now);
      const compared = await getRevenueComparison(current, previous);
      if (!compared.complete) {
        return fact("The comparison could not be read completely.", [compared.left.auditNote, compared.right.auditNote, "I am not showing a total."]);
      }
      const delta = compared.deltaSatang;
      return fact("This month compared with last month.", [
        `Metric: money collected. This is not deal value and not commission.`,
        `This month (${current.label}): ${money(compared.left.grossCollectedSatang)}.`,
        `Last month (${previous.label}): ${money(compared.right.grossCollectedSatang)}.`,
        `Difference: ${delta >= 0 ? "+" : "−"}${money(Math.abs(delta))}.`,
        compared.left.auditNote,
        RULES,
      ]);
    }

    let salesPersonId: string | null = null;
    let who: string | null = null;
    if (intent.kind === "revenue" && intent.staffName) {
      const scope = await staffScope(intent.staffName, role, actorId);
      if ("title" in scope) return scope;
      salesPersonId = scope.id;
      who = scope.label;
    }
    const range = intentRange(intent, now);
    const statement = await getRevenueByDateRange(range, {
      salesPersonId,
      serviceQuery: intent.serviceQuery,
    });
    if (!statement.complete) {
      return fact("The financial records for this period could not be read completely.", [
        statement.auditNote,
        "I am not showing a total.",
      ]);
    }
    const lines = describe(statement, range.label, who);
    if (salesPersonId && statement.paymentCount === 0) {
      const delivery = await deliveryPaymentsWithoutCredit(salesPersonId, range);
      if (delivery > 0) {
        lines.push(`${delivery} approved payment${delivery === 1 ? "" : "s"} in this period sit on bookings where ${who} is assigned to do the work, but is not the recorded deal closer. Those amounts are not included.`);
      }
    }
    if (intent.kind === "revenue_by_service" || intent.serviceQuery) {
      if (statement.serviceTotals.length === 0) lines.push("No approved service revenue matched.");
      else lines.push(...statement.serviceTotals.slice(0, 12).map((row, index) => `${index + 1}. ${row.name}: ${money(row.amount)}`));
    }
    if (intent.kind === "revenue" && intent.focus === "by_staff") {
      const ranked = statement.staffTotals.filter((row) => row.id);
      lines.push("Money collected, by deal closer:");
      if (ranked.length === 0) lines.push("No approved payment in this period is attributed to a deal closer.");
      else lines.push(...ranked.slice(0, 12).map((row, index) => `${index + 1}. ${row.name}: ${money(row.amount)}`));
      const deals = await getClosedDeals(range);
      if (!deals.complete) lines.push(deals.note ?? "Closed-deal values could not be read completely, so I am not ranking generated revenue.");
      else {
        const generated = summariseDeals(deals.rows, range);
        lines.push("Revenue generated is the stored deal value of bookings closed in this period. It is not added to money collected.");
        if (generated.missingValueCount > 0) lines.push(`${generated.missingValueCount} closed bookings have no stored deal value and are excluded from generated revenue.`);
        if (generated.byStaff.length === 0) lines.push("No closed booking in this period has a stored deal value.");
        else lines.push(...generated.byStaff.filter((row) => row.id).slice(0, 12).map((row, index) => `${index + 1}. ${row.name}: ${money(row.amount)} generated`));
      }
    }
    if (intent.kind === "revenue" && intent.focus === "deposits") {
      lines.unshift(`Deposits received: ${money(statement.depositSatang)}. Only approved payments marked as an initial deposit are included. A full payment is not relabelled as a deposit.`);
    }
    if (intent.kind === "revenue" && intent.focus === "by_customer") {
      lines.push(...statement.customerTotals.slice(0, 12).map((row, index) => `${index + 1}. ${row.name}: ${money(row.amount)}`));
    }
    if (intent.kind === "revenue" && intent.focus === "by_method") {
      lines.push(...statement.methodTotals.map((row) => `${row.name}: ${money(row.amount)}`));
    }
    if (intent.kind === "revenue" && intent.focus === "monthly" && intent.year) {
      const months = monthlyCollected(
        statement.lines.filter((line) => line.kind === "payment").map((line) => ({
          id: line.id,
          amount: line.amount,
          status: "approved",
          approvedAt: line.at,
          submittedAt: null,
        })),
        intent.year
      );
      const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      lines.push(...months.map((bucket) => `${names[bucket.month - 1]} ${intent.year}: ${money(bucket.satang)} from ${bucket.count} approved payments`));
      lines.push("Months with no approved payments are shown as zero. That is not a forecast.");
    }
    if (intent.kind === "revenue" && (intent.focus === "generated" || intent.focus === "bookings")) {
      const deals = intent.focus === "bookings" && salesPersonId
        ? await getAttributedBookings(salesPersonId)
        : await getClosedDeals(intent.focus === "bookings" ? null : range, salesPersonId);
      if (!deals.complete) {
        lines.push(deals.note ?? "The booking list could not be read completely. I am not showing a generated-revenue total.");
      } else if (intent.focus === "bookings") {
        lines.push(`Bookings recorded with ${who ?? "this person"} as the deal closer: ${deals.rows.length}.`);
        lines.push(...deals.rows.slice(0, 20).map((row) => `${row.caseNumber} · ${row.customerName} · ${row.serviceName} · ${row.status} · deal value ${row.dealValue == null ? "not recorded" : money(row.dealValue)}`));
        if (deals.rows.length > 20) lines.push(`Showing 20 of ${deals.rows.length} bookings. The count includes every attributed booking.`);
      } else {
        const generated = summariseDeals(deals.rows, range, salesPersonId);
        lines.unshift(`Revenue generated: ${money(generated.generatedSatang)} across ${generated.valuedCount} closed bookings with a stored deal value.`);
        if (generated.missingValueCount > 0) lines.splice(1, 0, `${generated.missingValueCount} closed bookings have no stored deal value, so they are not in the generated total.`);
        lines.splice(2, 0, "Generated revenue is not added to money collected.");
      }
    }
    if (intent.kind === "revenue" && (intent.focus === "expenses" || intent.focus === "cashflow" || intent.focus === "profit_services")) {
      const expenses = await getBusinessExpenses(range);
      if (!expenses.complete) {
        lines.push(expenses.note ?? "Expense records could not be read completely. I am not showing an expense or profit total.");
      } else {
        const summed = sumExpenses(expenses.rows, range.start, range.end);
        if (intent.focus === "expenses" || intent.focus === "cashflow") {
          lines.unshift(`Recorded business expenses: ${money(summed.total)} across ${summed.count} ledger rows. Cancelled rows are excluded. Sales commission is not added again here.`);
        }
        if (intent.focus === "cashflow") {
          lines.splice(1, 0, `Cash result, net collected minus those expenses: ${money(statement.netCollectedSatang - summed.total)}.`);
        }
        if (intent.focus === "profit_services") {
          const ranked = serviceProfit(statement.serviceTotals, expenses.rows, range.start, range.end);
          const profitable = ranked.filter((row) => row.result != null);
          if (profitable.length === 0 || profitable.every((row) => row.directCost === 0)) {
            lines.push("Profit cannot be calculated. No direct case cost is recorded against these services. The ranking below is money collected, not profit.");
            lines.push(...ranked.slice(0, 5).map((row, index) => `${index + 1}. ${row.name}: ${money(row.collected)} collected`));
          } else {
            lines.push(...profitable.slice(0, 5).map((row, index) => `${index + 1}. ${row.name}: collected ${money(row.collected)}, direct cost ${money(row.directCost)}, result ${money(row.result ?? 0)}`));
          }
        }
        lines.push(...summed.issues.slice(0, 5));
      }
    }
    if (intent.kind === "revenue" && intent.focus === "commission") {
      const commissions = await getStaffCommissions(intent.period === "all" ? null : range);
      if (!commissions.complete) {
        lines.push(commissions.note ?? "Commission records could not be read completely. I am not showing a commission total.");
      } else {
        const summary = summariseCommissions(commissions.rows, intent.period === "all" ? null : range, salesPersonId);
        lines.unshift(`Commission earned: ${money(summary.earnedSatang)}. Commission still outstanding: ${money(summary.outstandingSatang)}. Commission paid in the period: ${money(summary.paidSatang)}.`);
        lines.splice(1, 0, "Commission is not money collected from customers and is not added to revenue.");
        if (summary.missingCloseDates > 0) lines.splice(2, 0, `${summary.missingCloseDates} commission rows have no booking close date and were left out of this period.`);
        if (!salesPersonId) lines.push(...summary.byStaff.slice(0, 12).map((row, index) => `${index + 1}. ${row.name}: earned ${money(row.earned)}, outstanding ${money(row.outstanding)}`));
      }
    }
    const title = who
      ? `${who} — ${intent.kind === "revenue" && intent.focus === "generated" ? "generated and collected revenue" : "collected revenue"} for ${range.label}`
      : intent.kind === "revenue_by_service"
        ? `Approved revenue by service for ${range.label}`
        : `Collected revenue for ${range.label}`;
    return fact(title, lines, linksFor(statement));
  } catch {
    return fact("The financial information could not be retrieved.", [
      "I did not estimate a figure.",
      "The payment records were not available for this question.",
    ]);
  }
}

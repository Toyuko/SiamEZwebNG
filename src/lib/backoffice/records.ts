import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { extractDocumentFields } from "@/lib/documents/extract";
import { endOfBangkokDay, resolveDateRange, startOfBangkokDay } from "@/lib/finance/dates";
import { listReceivables } from "@/lib/finance/summaries";
import { sumSatang } from "@/lib/finance/money";
import {
  addCalendarDays,
  addCalendarMonths,
  daysInMonth,
  todayInBangkok,
  toUtcDateOnly,
} from "@/lib/follow-ups/dates";
import { OPEN_FOLLOW_UP_STATUSES } from "@/lib/follow-ups/constants";
import { getVehicleServicePricing } from "@/lib/vehicle-leads/pricing";
import { answerCommand } from "@/lib/backoffice/command";
import { explainRevenue } from "@/lib/backoffice/finance-answer";
import { readEveryPage } from "@/lib/finance/read-all";
import { findDuplicateGroups } from "@/lib/backoffice/duplicates";
import {
  missingRequiredDocuments,
  reviewExtractedDocuments,
  type ExtractedDoc,
} from "@/lib/backoffice/documents";
import { dateKeyFromParts, formatSatang, formatWhen } from "@/lib/backoffice/format";
import type { BackofficeIntent } from "@/lib/backoffice/intent";
import { rankKnowledge } from "@/lib/backoffice/knowledge-rank";
import { parseAssigneeName, parseCustomerDraft, parseDueDateKey, buildReminderPlan } from "@/lib/backoffice/parse";
import { priceSelection, selectPriceCodes } from "@/lib/backoffice/pricing";
import { bangkokMinutes, firstFreeSlot } from "@/lib/backoffice/slots";
import type { AssistantFact, BackofficeContext } from "@/lib/backoffice/types";

const CLOSED_CASE = ["completed", "cancelled", "refunded"] as const;
const CLOSED_RENEWAL = ["RENEWED", "CANCELLED", "NOT_INTERESTED"] as const;

function fact(title: string, lines: string[], extra?: Partial<AssistantFact>): AssistantFact {
  return { title, lines, links: extra?.links ?? [], context: extra?.context, pending: extra?.pending };
}

function customerLabel(
  user: { name: string | null; email: string | null } | null | undefined,
  guestName?: string | null,
  guestEmail?: string | null
): string {
  return user?.name || guestName || user?.email || guestEmail || "Unknown customer";
}

function bangkokRange(when: "today" | "tomorrow"): { key: string; start: Date; end: Date } {
  const today = todayInBangkok();
  const parts = when === "today" ? today : addCalendarDays(today, 1);
  const key = dateKeyFromParts(parts);
  return { key, start: startOfBangkokDay(key), end: endOfBangkokDay(key) };
}

function monthBounds(offset: number): { startKey: string; endKey: string } {
  const shifted = addCalendarMonths({ ...todayInBangkok(), day: 1 }, offset);
  const startKey = dateKeyFromParts({ ...shifted, day: 1 });
  const endKey = dateKeyFromParts({ ...shifted, day: daysInMonth(shifted.year, shifted.month) });
  return { startKey, endKey };
}

export async function answerIntent(
  intent: BackofficeIntent,
  context: BackofficeContext,
  role: "admin" | "staff" = "staff",
  actorId: string | null = null
): Promise<AssistantFact> {
  const extended = await answerCommand(intent, context, role, actorId);
  if (extended) return extended;
  switch (intent.kind) {
    case "help":
      return helpFact();
    case "outstanding_payments":
      return outstandingPayments();
    case "deposits":
      return outstandingDeposits();
    case "renewals":
      return renewals(intent.window);
    case "unconfirmed_bookings":
      return unconfirmedBookings();
    case "bookings":
      return bookings(intent.when);
    case "free_slot":
      return freeSlot(intent.when);
    case "send_reminders":
      return proposeReminders(intent.when);
    case "revenue":
    case "revenue_by_service":
    case "revenue_compare":
      return explainRevenue(intent, role, actorId);
    case "vehicles_for_sale":
      return vehiclesForSale();
    case "vehicle_fees":
      return vehicleFees();
    case "vehicle_leads":
      return vehicleLeads(intent);
    case "tasks":
      return tasks(intent.scope);
    case "unassigned":
      return unassignedCases();
    case "missing_documents":
      return missingDocuments();
    case "quotes":
      return openQuotes();
    case "draft_quote":
      return proposeQuote(intent.request, context);
    case "create_task":
      return proposeTask(intent.request, context);
    case "create_customer":
      return proposeCustomer(intent.request);
    case "draft_message":
      return draftMessage(intent.request, context);
    case "daily_report":
      return dailyReport(intent.reportKind);
    case "document_review":
      return documentReview(intent.query, context);
    case "duplicates":
      return duplicates(intent.query);
    case "customer_summary":
      return customerSummary(intent.query, context);
    case "customer_search":
      return searchCustomers(intent.query);
    case "knowledge":
      return knowledge(intent.query);
    case "unknown":
      return knowledge(intent.query);
    default:
      return fact("I could not match that request to a record.", ["Try naming the customer, booking, or report you want."]);
  }
}

function helpFact(): AssistantFact {
  return fact("I can work from live SiamEZ records.", [
    "Ask about customers, bookings, jobs, invoices, payments, quotations, documents, staff tasks, workflows, and the management briefing.",
    "I will not change a customer, invoice, job, or message until you confirm.",
    "I will not invent a payment or a booking. If a record is missing, I will say so.",
    "Document checks are for staff review. I do not certify that a document is genuine or legally valid.",
    "Refunds and payment edits stay in the finance screens.",
  ]);
}

async function searchCustomers(query: string): Promise<AssistantFact> {
  const q = query.trim();
  if (!q) return fact("Who should I look up?", ["Give a name, email, phone number, or case number."]);
  const caseHit = await prisma.case.findFirst({
    where: { caseNumber: { equals: q, mode: "insensitive" } },
    select: { id: true, caseNumber: true, guestName: true, userId: true, user: { select: { name: true, email: true } } },
  });
  if (caseHit) {
    return fact(`Found case ${caseHit.caseNumber}.`, [`Customer: ${customerLabel(caseHit.user, caseHit.guestName)}`], {
      links: [{ href: `/admin/cases/${caseHit.id}`, label: caseHit.caseNumber }],
      context: {
        lastCaseId: caseHit.id,
        lastCaseNumber: caseHit.caseNumber,
        lastCustomerId: caseHit.userId,
        lastCustomerName: customerLabel(caseHit.user, caseHit.guestName),
      },
    });
  }
  const users = await prisma.user.findMany({
    where: {
      role: "customer",
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q.replace(/\s+/g, ""), mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true, phone: true },
    take: 8,
    orderBy: { updatedAt: "desc" },
  });
  if (users.length === 0) {
    return fact("No customer record matched.", [`I looked for "${q}" and found no customer. I did not create one.`]);
  }
  const lines = users.map((user) => `${user.name ?? "Unnamed"} · ${user.email} · ${user.phone ?? "no phone"}`);
  const only = users.length === 1 ? users[0] : null;
  return fact(
    users.length === 1 ? `Found ${only?.name ?? only?.email}.` : `Found ${users.length} customers. Ask again with the email if you want one file.`,
    lines,
    {
      links: users.map((user) => ({ href: `/admin/clients/${user.id}`, label: user.name ?? user.email })),
      context: only
        ? { lastCustomerId: only.id, lastCustomerName: only.name ?? only.email }
        : undefined,
    }
  );
}

async function customerSummary(query: string | null, context: BackofficeContext): Promise<AssistantFact> {
  const lookup = query?.trim() || context.lastCustomerName || "";
  if (!query && context.lastCustomerId) {
    return summarizeUser(context.lastCustomerId);
  }
  if (!lookup && context.lastCaseId) return summarizeCase(context.lastCaseId);
  if (!lookup) return fact("Which customer?", ["Search for someone first, then ask for their history."]);
  const found = await searchCustomers(lookup);
  if (!found.context?.lastCustomerId) return found;
  return summarizeUser(found.context.lastCustomerId);
}

async function summarizeUser(userId: string): Promise<AssistantFact> {
  const user = await prisma.user.findFirst({
    where: { id: userId, role: "customer" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      casesAsClient: {
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          caseNumber: true,
          status: true,
          scheduledAt: true,
          documentsRequired: true,
          service: { select: { name: true } },
          otherServiceName: true,
          documents: { select: { name: true, documentType: true } },
          payments: { where: { status: "approved" }, select: { amount: true } },
          invoices: { select: { amount: true, status: true, depositAmount: true } },
          quotes: { select: { status: true, quoteNumber: true, amount: true } },
          staffAssignments: { select: { user: { select: { name: true } } } },
        },
      },
      followUpsAsClient: {
        where: { status: { in: OPEN_FOLLOW_UP_STATUSES } },
        orderBy: { dueDate: "asc" },
        take: 6,
        select: { title: true, dueDate: true, status: true, assignedStaff: { select: { name: true } } },
      },
      driverLicenseRenewals: {
        orderBy: { nextRenewalDate: "asc" },
        take: 3,
        select: { renewalType: true, nextRenewalDate: true, status: true, assignedStaff: { select: { name: true } } },
      },
    },
  });
  if (!user) return fact("That customer is no longer available.", ["I did not change any record."]);
  const lines = [
    `${user.name ?? "Unnamed"} · ${user.email} · ${user.phone ?? "no phone"}`,
    user.casesAsClient.length === 0
      ? "No bookings are linked to this customer."
      : `Bookings: ${user.casesAsClient
          .map((item) => `${item.caseNumber} ${item.service?.name ?? item.otherServiceName ?? "service"} (${item.status})`)
          .join("; ")}`,
  ];
  let outstanding = 0;
  const missing: string[] = [];
  for (const item of user.casesAsClient) {
    const invoiced = sumSatang(item.invoices.filter((invoice) => invoice.status !== "rejected").map((invoice) => invoice.amount));
    const paid = sumSatang(item.payments.map((payment) => payment.amount));
    outstanding += Math.max(0, invoiced - paid);
    const gaps = missingRequiredDocuments(item.documentsRequired, item.documents);
    if (gaps.length) missing.push(`${item.caseNumber}: ${gaps.join(", ")}`);
  }
  lines.push(`Outstanding on linked invoices: ${formatSatang(outstanding)}.`);
  lines.push(missing.length ? `Documents still named on the case: ${missing.join(" · ")}` : "No checklist gaps on the recent bookings.");
  const staff = [
    ...new Set(
      user.casesAsClient.flatMap((item) => item.staffAssignments.map((assignment) => assignment.user.name).filter(Boolean))
    ),
  ];
  lines.push(staff.length ? `Staff on recent bookings: ${staff.join(", ")}.` : "No staff member is assigned on the recent bookings.");
  const nextAppointment = user.casesAsClient.find((item) => item.scheduledAt && item.scheduledAt >= new Date());
  lines.push(
    nextAppointment
      ? `Next appointment: ${nextAppointment.caseNumber} ${formatWhen(nextAppointment.scheduledAt)}.`
      : "No upcoming appointment on the recent bookings."
  );
  lines.push(
    user.followUpsAsClient.length
      ? `Open follow-ups: ${user.followUpsAsClient.map((item) => `${item.title} (${item.status})`).join("; ")}.`
      : "No open follow-up."
  );
  lines.push(
    user.driverLicenseRenewals.length
      ? `Licence renewals: ${user.driverLicenseRenewals
          .map((item) => `${item.renewalType} ${item.status} ${formatWhen(item.nextRenewalDate)}`)
          .join("; ")}.`
      : "No driving-licence renewal record."
  );
  return fact(`Customer file: ${user.name ?? user.email}`, lines, {
    links: [{ href: `/admin/clients/${user.id}`, label: "Open customer" }],
    context: { lastCustomerId: user.id, lastCustomerName: user.name ?? user.email, lastCaseId: user.casesAsClient[0]?.id ?? null, lastCaseNumber: user.casesAsClient[0]?.caseNumber ?? null },
  });
}

async function summarizeCase(caseId: string): Promise<AssistantFact> {
  const row = await prisma.case.findUnique({
    where: { id: caseId },
    select: { id: true, caseNumber: true, userId: true, guestName: true, user: { select: { name: true, email: true } } },
  });
  if (!row) return fact("That booking was not found.", []);
  if (row.userId) return summarizeUser(row.userId);
  return fact(`Guest booking ${row.caseNumber}`, [
    `${customerLabel(row.user, row.guestName)} has no customer account, so I cannot build a full history from a user record.`,
  ], {
    links: [{ href: `/admin/cases/${row.id}`, label: row.caseNumber }],
    context: { lastCaseId: row.id, lastCaseNumber: row.caseNumber, lastCustomerName: row.guestName },
  });
}

async function duplicates(query: string | null): Promise<AssistantFact> {
  const people = await prisma.user.findMany({
    where: { role: "customer" },
    select: { id: true, name: true, email: true, phone: true },
    take: 1000,
    orderBy: { createdAt: "desc" },
  });
  let groups = findDuplicateGroups(people);
  if (query) {
    const needle = query.toLowerCase();
    groups = groups.filter((group) =>
      group.people.some((person) => `${person.name ?? ""} ${person.email ?? ""} ${person.phone ?? ""}`.toLowerCase().includes(needle))
    );
  }
  if (groups.length === 0) return fact("No duplicate customers matched.", ["I compared email, phone, and name on customer records. I did not merge anyone."]);
  return fact(`Possible duplicates: ${Math.min(groups.length, 12)} group${groups.length === 1 ? "" : "s"}.`, [
    ...groups.slice(0, 12).map((group) => `${group.reason} ${group.key}: ${group.people.map((person) => person.name ?? person.email).join(" · ")}`),
    "I did not merge or overwrite these records.",
  ]);
}

async function bookings(when: "today" | "tomorrow"): Promise<AssistantFact> {
  const range = bangkokRange(when);
  const rows = await prisma.case.findMany({
    where: { scheduledAt: { gte: range.start, lte: range.end }, status: { not: "cancelled" } },
    orderBy: { scheduledAt: "asc" },
    take: 40,
    select: {
      id: true,
      caseNumber: true,
      status: true,
      scheduledAt: true,
      scheduleTimeTbd: true,
      guestName: true,
      service: { select: { name: true } },
      otherServiceName: true,
      user: { select: { name: true, email: true } },
    },
  });
  if (rows.length === 0) return fact(`No bookings on ${range.key}.`, ["Times are Asia/Bangkok. Cancelled bookings are excluded."]);
  return fact(`${rows.length} booking${rows.length === 1 ? "" : "s"} on ${range.key}.`, rows.map((row) => {
    const whenLabel = row.scheduleTimeTbd ? "time not set" : formatWhen(row.scheduledAt);
    return `${whenLabel} · ${row.caseNumber} · ${customerLabel(row.user, row.guestName)} · ${row.service?.name ?? row.otherServiceName ?? "service"} · ${row.status}`;
  }), {
    links: rows.slice(0, 8).map((row) => ({ href: `/admin/cases/${row.id}`, label: row.caseNumber })),
  });
}

async function unconfirmedBookings(): Promise<AssistantFact> {
  const rows = await prisma.case.findMany({
    where: { status: { in: ["new", "under_review"] } },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      caseNumber: true,
      status: true,
      scheduledAt: true,
      guestName: true,
      service: { select: { name: true } },
      user: { select: { name: true, email: true } },
    },
  });
  if (rows.length === 0) return fact("No unconfirmed bookings.", ["Nothing is currently new or under review."]);
  return fact(`${rows.length} booking${rows.length === 1 ? "" : "s"} not yet confirmed.`, rows.map((row) =>
    `${row.caseNumber} · ${customerLabel(row.user, row.guestName)} · ${row.service?.name ?? "service"} · ${row.status} · ${formatWhen(row.scheduledAt)}`
  ), { links: rows.slice(0, 8).map((row) => ({ href: `/admin/cases/${row.id}`, label: row.caseNumber })) });
}

async function freeSlot(when: "today" | "tomorrow"): Promise<AssistantFact> {
  const range = bangkokRange(when);
  const [events, cases] = await Promise.all([
    prisma.event.findMany({
      where: { start: { gte: range.start, lte: range.end } },
      select: { start: true, end: true, title: true },
    }),
    prisma.case.findMany({
      where: { scheduledAt: { gte: range.start, lte: range.end }, status: { not: "cancelled" }, scheduleTimeTbd: false },
      select: { scheduledAt: true, caseNumber: true },
    }),
  ]);
  const busy = [
    ...events.map((event) => [bangkokMinutes(event.start), bangkokMinutes(event.end)] as [number, number]),
    ...cases.map((row) => {
      const start = bangkokMinutes(row.scheduledAt!);
      return [start, start + 60] as [number, number];
    }),
  ];
  const slot = firstFreeSlot(busy);
  return fact(
    slot ? `First open hour on ${range.key} is ${slot} Asia/Bangkok.` : `No 60-minute gap between 09:00 and 17:00 on ${range.key}.`,
    [
      `${events.length + cases.length} calendar item${events.length + cases.length === 1 ? "" : "s"} already occupy that day.`,
      "This uses existing appointments only. Creating a booking still goes through the normal job form.",
    ]
  );
}

async function proposeReminders(when: "today" | "tomorrow"): Promise<AssistantFact> {
  const range = bangkokRange(when);
  const rows = await prisma.case.findMany({
    where: { scheduledAt: { gte: range.start, lte: range.end }, status: { notIn: ["cancelled", "completed"] } },
    select: {
      id: true,
      caseNumber: true,
      guestName: true,
      guestEmail: true,
      scheduledAt: true,
      service: { select: { name: true } },
      otherServiceName: true,
      user: { select: { name: true, email: true } },
    },
    take: 50,
  });
  const plan = buildReminderPlan(
    rows
      .map((row) => ({
        caseId: row.id,
        caseNumber: row.caseNumber,
        email: row.user?.email || row.guestEmail || "",
        name: customerLabel(row.user, row.guestName),
        whenLabel: formatWhen(row.scheduledAt),
        service: row.service?.name ?? row.otherServiceName ?? "appointment",
      }))
      .filter((row) => row.email.includes("@"))
  );
  if (plan.bookings.length === 0) {
    return fact(`No reminder can be sent for ${range.key}.`, ["Those bookings have no email address, or there are none."]);
  }
  return fact(plan.summary, plan.bookings.map((row) => `${row.name} · ${row.email} · ${row.caseNumber} · ${row.whenLabel}`), {
    pending: {
      toolName: "send_appointment_reminders",
      summary: plan.summary,
      payload: { caseIds: plan.bookings.map((row) => row.caseId), whenKey: range.key },
    },
  });
}

async function outstandingPayments(): Promise<AssistantFact> {
  const rows = (await listReceivables()).filter((row) => row.outstanding > 0);
  if (rows.length === 0) return fact("No outstanding customer balances.", ["Open invoices have no remaining balance in the payment records."]);
  const total = rows.reduce((sum, row) => sum + row.outstanding, 0);
  const shown = rows.slice(0, 25);
  const lines = [
    "Every open invoice was included. This is not a dashboard sample.",
    ...shown.map((row) => `${row.customerName} · ${row.caseNumber} · ${formatSatang(row.outstanding)} of ${formatSatang(row.total)} · ${row.status}`),
  ];
  if (rows.length > shown.length) lines.push(`Showing ${shown.length} of ${rows.length} invoices. The total includes every outstanding invoice.`);
  return fact(
    `Outstanding balances: ${formatSatang(total)} across ${rows.length} invoice${rows.length === 1 ? "" : "s"}.`,
    lines,
    { links: shown.slice(0, 8).map((row) => ({ href: `/admin/cases/${row.caseId}`, label: row.caseNumber })) }
  );
}

async function outstandingDeposits(): Promise<AssistantFact> {
  const read = await readEveryPage((cursor, take) =>
    prisma.invoice.findMany({
      where: { depositAmount: { not: null }, status: { in: ["draft", "unpaid", "pending_verification"] } },
      orderBy: { id: "asc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        payments: { where: { status: "approved" }, select: { amount: true } },
        user: { select: { name: true, email: true } },
        case: { select: { id: true, caseNumber: true, guestName: true } },
      },
    })
  );
  if (!read.complete) {
    return fact("Outstanding deposits could not be read completely.", [read.note ?? "I am not showing a total."]);
  }
  const due = read.rows
    .map((invoice) => {
      const paid = sumSatang(invoice.payments.map((payment) => payment.amount));
      const deposit = invoice.depositAmount ?? 0;
      return { invoice, remaining: Math.max(0, deposit - paid) };
    })
    .filter((row) => row.remaining > 0);
  if (due.length === 0) return fact("No outstanding deposits.", ["Every deposit invoice was checked. They are either paid or not recorded."]);
  const shown = due.slice(0, 25);
  const lines = shown.map(({ invoice, remaining }) =>
    `${customerLabel(invoice.user, invoice.case.guestName)} · ${invoice.case.caseNumber} · ${formatSatang(remaining)} still due of ${formatSatang(invoice.depositAmount ?? 0)}`
  );
  if (due.length > shown.length) lines.push(`Showing ${shown.length} of ${due.length} deposits. The count includes every short deposit.`);
  return fact(`${due.length} deposit${due.length === 1 ? "" : "s"} still short.`, lines);
}

async function approvedTotal(preset: "today" | "this_week" | "this_month" | "last_month"): Promise<number> {
  const range = resolveDateRange(preset);
  const sum = await prisma.payment.aggregate({
    where: {
      status: "approved",
      OR: [
        { approvedAt: { gte: range.start, lte: range.end } },
        { approvedAt: null, submittedAt: { gte: range.start, lte: range.end } },
      ],
    },
    _sum: { amount: true },
  });
  return sum._sum.amount ?? 0;
}

async function renewals(window: "this_month" | "next_month" | "overdue" | "soon"): Promise<AssistantFact> {
  const rows = await prisma.driverLicenseRenewal.findMany({
    where: { status: { notIn: [...CLOSED_RENEWAL] } },
    orderBy: { nextRenewalDate: "asc" },
    take: 300,
    select: {
      id: true,
      renewalType: true,
      status: true,
      nextRenewalDate: true,
      client: { select: { id: true, name: true, email: true, phone: true } },
      assignedStaff: { select: { name: true } },
    },
  });
  const todayKey = dateKeyFromParts(todayInBangkok());
  const thisMonth = monthBounds(0);
  const nextMonth = monthBounds(1);
  const soonEnd = dateKeyFromParts(addCalendarDays(todayInBangkok(), 90));
  const stamp = (date: Date) => dateKeyFromParts({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
  const decorated = rows.map((row) => ({ row, key: stamp(row.nextRenewalDate) }));
  const buckets = {
    overdue: decorated.filter((item) => item.key < todayKey),
    thisMonth: decorated.filter((item) => item.key >= thisMonth.startKey && item.key <= thisMonth.endKey),
    nextMonth: decorated.filter((item) => item.key >= nextMonth.startKey && item.key <= nextMonth.endKey),
    soon: decorated.filter((item) => item.key >= todayKey && item.key <= soonEnd),
  };
  const selected =
    window === "overdue" ? buckets.overdue : window === "next_month" ? buckets.nextMonth : window === "this_month" ? buckets.thisMonth : buckets.soon;
  const lines = [
    `Overdue ${buckets.overdue.length} · this month ${buckets.thisMonth.length} · next month ${buckets.nextMonth.length} · within 90 days ${buckets.soon.length}.`,
    ...selected.slice(0, 20).map(({ row, key }) =>
      `${key} · ${row.client.name ?? row.client.email} · ${row.renewalType} · ${row.status} · ${row.assignedStaff?.name ?? "unassigned"} · ${row.client.phone ?? row.client.email}`
    ),
  ];
  if (selected.length === 0) lines.push("Nothing in that window.");
  return fact("Driving licence renewals from staff-recorded expiry dates.", lines, {
    links: [{ href: "/admin/driver-license-followups", label: "Open renewal tracker" }],
  });
}

async function vehiclesForSale(): Promise<AssistantFact> {
  const rows = await prisma.salesVehicle.findMany({
    where: { published: true, status: "available" },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: { title: true, category: true, priceAmount: true, priceCurrency: true, year: true, slug: true },
  });
  if (rows.length === 0) return fact("No published vehicles are marked available.", ["The sales catalogue has nothing listed as available right now."]);
  return fact(`${rows.length} vehicle${rows.length === 1 ? "" : "s"} listed for sale.`, rows.map((row) =>
    `${row.title} · ${row.category} · ${row.year} · ${formatSatang(row.priceAmount * 100, row.priceCurrency)}`
  ), { links: [{ href: "/admin/sales", label: "Open sales inventory" }] });
}

async function vehicleLeads(intent: Extract<BackofficeIntent, { kind: "vehicle_leads" }>): Promise<AssistantFact> {
  const staleBefore = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await prisma.vehicleLead.findMany({
    where: {
      status: { notIn: ["completed", "cancelled", "sold_or_purchased"] },
      ...(intent.leadType ? { type: intent.leadType } : {}),
      ...(intent.vehicleKind ? { vehicleKind: intent.vehicleKind } : {}),
      ...(intent.stale ? { updatedAt: { lt: staleBefore } } : {}),
    },
    orderBy: { updatedAt: "asc" },
    take: 25,
    select: {
      id: true,
      leadNumber: true,
      type: true,
      status: true,
      customerName: true,
      displayTitle: true,
      vehicleKind: true,
      updatedAt: true,
      assignedStaff: { select: { name: true } },
    },
  });
  if (rows.length === 0) return fact("No vehicle leads matched.", ["I did not invent a sourcing request."]);
  return fact(`${rows.length} open vehicle lead${rows.length === 1 ? "" : "s"}.`, rows.map((row) =>
    `${row.leadNumber} · ${row.type} · ${row.vehicleKind} · ${row.customerName} · ${row.displayTitle} · ${row.status} · updated ${formatWhen(row.updatedAt)} · ${row.assignedStaff?.name ?? "unassigned"}`
  ), { links: rows.slice(0, 8).map((row) => ({ href: `/admin/vehicle-leads`, label: row.leadNumber })) });
}

async function vehicleFees(): Promise<AssistantFact> {
  const pricing = await getVehicleServicePricing();
  const leads = await prisma.vehicleLead.findMany({
    where: { type: "buy", caseId: { not: null }, status: { notIn: ["completed", "cancelled", "sold_or_purchased"] } },
    select: { caseId: true, leadNumber: true, customerName: true },
    take: 40,
  });
  const caseIds = leads.map((lead) => lead.caseId).filter((id): id is string => Boolean(id));
  const invoices = caseIds.length
    ? await prisma.invoice.findMany({
        where: { caseId: { in: caseIds }, status: { in: ["unpaid", "pending_verification", "draft"] } },
        include: { payments: { where: { status: "approved" }, select: { amount: true } } },
      })
    : [];
  const outstanding = invoices.reduce((sum, invoice) => {
    const paid = sumSatang(invoice.payments.map((payment) => payment.amount));
    return sum + Math.max(0, invoice.amount - paid);
  }, 0);
  return fact("Vehicle sourcing fees.", [
    `Configured sourcing fee: ${formatSatang(Math.round(pricing.sourcingFeeBaht * 100))}. This is the settings price, not money owed.`,
    `Configured selling fee: ${formatSatang(Math.round(pricing.sellingFeeBaht * 100))}.`,
    caseIds.length === 0
      ? "No open sourcing lead is linked to a booking, so there is no invoice balance to report."
      : `Outstanding on invoices linked to open sourcing leads: ${formatSatang(outstanding)}.`,
    `${leads.length} open sourcing lead${leads.length === 1 ? "" : "s"} linked to a booking.`,
  ]);
}

async function tasks(scope: "overdue" | "today"): Promise<AssistantFact> {
  const today = toUtcDateOnly(todayInBangkok());
  const rows = await prisma.followUp.findMany({
    where: {
      status: { in: scope === "overdue" ? ["PENDING", "DUE", "IN_PROGRESS"] : OPEN_FOLLOW_UP_STATUSES },
      dueDate: scope === "overdue" ? { lt: today } : { lte: today },
    },
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
    take: 30,
    select: {
      title: true,
      dueDate: true,
      status: true,
      priority: true,
      client: { select: { name: true, email: true } },
      assignedStaff: { select: { name: true } },
    },
  });
  if (rows.length === 0) return fact(scope === "overdue" ? "No overdue staff tasks." : "Nothing open is due today.", []);
  const byStaff = new Map<string, number>();
  for (const row of rows) {
    const name = row.assignedStaff?.name ?? "Unassigned";
    byStaff.set(name, (byStaff.get(name) ?? 0) + 1);
  }
  return fact(
    scope === "overdue" ? `${rows.length} overdue task${rows.length === 1 ? "" : "s"}.` : `${rows.length} task${rows.length === 1 ? "" : "s"} due today or earlier.`,
    [
      ...[...byStaff.entries()].map(([name, count]) => `${name}: ${count}`),
      ...rows.slice(0, 15).map((row) => `${formatWhen(row.dueDate)} · ${row.priority} · ${row.title} · ${row.client.name ?? row.client.email} · ${row.assignedStaff?.name ?? "unassigned"}`),
    ],
    { links: [{ href: "/admin/followups", label: "Open follow-ups" }] }
  );
}

async function unassignedCases(): Promise<AssistantFact> {
  const rows = await prisma.case.findMany({
    where: { status: { notIn: [...CLOSED_CASE] }, staffAssignments: { none: {} } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, caseNumber: true, status: true, guestName: true, service: { select: { name: true } }, user: { select: { name: true, email: true } } },
  });
  if (rows.length === 0) return fact("Every open booking has a staff assignment.", []);
  return fact(`${rows.length} open booking${rows.length === 1 ? "" : "s"} without a staff assignment.`, rows.map((row) =>
    `${row.caseNumber} · ${customerLabel(row.user, row.guestName)} · ${row.service?.name ?? "service"} · ${row.status}`
  ), { links: rows.slice(0, 8).map((row) => ({ href: `/admin/cases/${row.id}`, label: row.caseNumber })) });
}

async function missingDocuments(): Promise<AssistantFact> {
  const rows = await prisma.case.findMany({
    where: { status: { notIn: [...CLOSED_CASE] }, documentsRequired: { not: Prisma.DbNull } },
    orderBy: { updatedAt: "desc" },
    take: 40,
    select: {
      id: true,
      caseNumber: true,
      guestName: true,
      documentsRequired: true,
      documents: { select: { name: true, documentType: true } },
      user: { select: { name: true, email: true } },
    },
  });
  const gaps = rows
    .map((row) => ({ row, missing: missingRequiredDocuments(row.documentsRequired, row.documents) }))
    .filter((item) => item.missing.length > 0);
  if (gaps.length === 0) return fact("No open booking has a checklist item still missing.", ["Cases without a checklist are not counted."]);
  return fact(`${gaps.length} booking${gaps.length === 1 ? "" : "s"} still missing named documents.`, gaps.slice(0, 20).map(({ row, missing }) =>
    `${row.caseNumber} · ${customerLabel(row.user, row.guestName)} · missing ${missing.join(", ")}`
  ), { links: gaps.slice(0, 8).map(({ row }) => ({ href: `/admin/cases/${row.id}`, label: row.caseNumber })) });
}

async function openQuotes(): Promise<AssistantFact> {
  const rows = await prisma.quote.findMany({
    where: { status: { in: ["draft", "generated", "sent", "viewed"] } },
    orderBy: { updatedAt: "desc" },
    take: 25,
    select: {
      id: true,
      quoteNumber: true,
      status: true,
      amount: true,
      sentAt: true,
      user: { select: { name: true, email: true } },
      service: { select: { name: true } },
    },
  });
  const waiting = rows.filter((row) => row.status === "sent" || row.status === "viewed");
  const lines = [
    `${waiting.length} sent or viewed and not accepted. ${rows.length - waiting.length} still draft or generated.`,
    ...rows.slice(0, 20).map((row) => `${row.quoteNumber ?? row.id.slice(0, 8)} · ${row.user?.name ?? row.user?.email ?? "no customer"} · ${row.service.name} · ${row.status} · ${formatSatang(row.amount)}`),
  ];
  return fact("Quotations that are not accepted.", lines, {
    links: rows.slice(0, 8).map((row) => ({ href: `/admin/quotes/${row.id}`, label: row.quoteNumber ?? "Quote" })),
  });
}

async function proposeQuote(request: string, context: BackofficeContext): Promise<AssistantFact> {
  const catalogue = await prisma.backofficePriceItem.findMany({
    where: { active: true },
    select: { code: true, name: true, amountSatang: true, active: true },
  });
  const selection = priceSelection(selectPriceCodes(request), catalogue);
  if (selection.lines.length === 0) {
    return fact("I could not match that request to an active catalogue price.", [
      selection.missing.length ? `Missing or inactive codes: ${selection.missing.join(", ")}.` : "Name the service, for example car licence, motorcycle licence, or both.",
      "I did not save a quotation.",
    ]);
  }
  const services = await prisma.service.findMany({
    where: { active: true },
    select: { id: true, name: true, slug: true },
    orderBy: { sortOrder: "asc" },
    take: 100,
  });
  const needle = /marriage/.test(request.toLowerCase())
    ? /marriage/
    : /translation/.test(request.toLowerCase())
      ? /translat/
      : /residential/.test(request.toLowerCase())
        ? /resident/
        : /licen|driv|permit/;
  const service = services.find((item) => needle.test(`${item.name} ${item.slug}`.toLowerCase())) ?? services[0];
  if (!service) return fact("There is no active service to attach this quotation to.", ["Add a service in the catalogue first. I did not save a quote."]);
  const lines = selection.lines.map((line) => `${line.name}: ${formatSatang(line.amountSatang)}`);
  lines.push(`Total: ${formatSatang(selection.totalSatang)}.`);
  if (selection.usedPackage) lines.push("The car and motorcycle lines were replaced by the combined package in the catalogue.");
  lines.push("This becomes a draft quotation only after you confirm. It is not sent to the customer.");
  return fact("Draft quotation ready for confirmation.", lines, {
    context,
    pending: {
      toolName: "save_draft_quote",
      summary: `Save a draft quotation for ${formatSatang(selection.totalSatang)} on ${service.name}.`,
      payload: {
        serviceId: service.id,
        userId: context.lastCustomerId ?? null,
        amountSatang: selection.totalSatang,
        notes: request.slice(0, 500),
        lines: selection.lines,
      },
    },
  });
}

async function proposeTask(request: string, context: BackofficeContext): Promise<AssistantFact> {
  let clientId = context.lastCustomerId ?? null;
  let clientName = context.lastCustomerName ?? null;
  const named = request.match(/\bwith\s+([A-Za-z][A-Za-z .'-]{1,60})/i)?.[1];
  if (!clientId && named) {
    const found = await searchCustomers(named);
    clientId = found.context?.lastCustomerId ?? null;
    clientName = found.context?.lastCustomerName ?? null;
  }
  if (!clientId) {
    return fact("Which customer is this task for?", ["Open a customer in the chat first, or name someone who already has a record. I did not create a task."]);
  }
  const assigneeName = parseAssigneeName(request);
  let assignedStaffId: string | null = null;
  let assigneeLabel = "unassigned";
  if (assigneeName) {
    const staff = await prisma.user.findFirst({
      where: { role: { in: ["admin", "staff"] }, name: { contains: assigneeName, mode: "insensitive" } },
      select: { id: true, name: true },
    });
    if (!staff) {
      return fact(`I could not find a staff member named ${assigneeName}.`, ["I did not assign the task to someone else."]);
    }
    assignedStaffId = staff.id;
    assigneeLabel = staff.name ?? assigneeName;
  }
  const dueDate = parseDueDateKey(request);
  const followUpType = /document/.test(request.toLowerCase())
    ? "DOCUMENT_REQUEST"
    : /payment|deposit|invoice/.test(request.toLowerCase())
      ? "PAYMENT"
      : /renew/.test(request.toLowerCase())
        ? "RENEWAL"
        : "CLIENT_CONTACT";
  return fact("Follow-up task ready for confirmation.", [
    `Customer: ${clientName ?? clientId}`,
    `Due: ${dueDate} (Asia/Bangkok)`,
    `Assign to: ${assigneeLabel}`,
    "Customer email stays off. This is an internal task until you confirm.",
  ], {
    pending: {
      toolName: "create_follow_up",
      summary: `Create a follow-up for ${clientName ?? "this customer"} due ${dueDate}.`,
      payload: {
        clientId,
        caseId: context.lastCaseId ?? null,
        title: request.slice(0, 160),
        dueDate,
        assignedStaffId,
        followUpType,
      },
    },
  });
}

async function proposeCustomer(request: string): Promise<AssistantFact> {
  const draft = parseCustomerDraft(request);
  if (!draft.email) return fact("I need an email address before creating a customer.", ["I did not create or change a record."]);
  const existing = await prisma.user.findUnique({
    where: { email: draft.email },
    select: { id: true, name: true, email: true, role: true },
  });
  if (existing) {
    return fact("That email already exists. I did not change it.", [
      `${existing.name ?? existing.email} is a ${existing.role} record.`,
    ], { links: existing.role === "customer" ? [{ href: `/admin/clients/${existing.id}`, label: "Open record" }] : [] });
  }
  return fact("New customer ready for confirmation.", [
    `Name: ${draft.name ?? "not provided"}`,
    `Email: ${draft.email}`,
    `Phone: ${draft.phone ?? "not provided"}`,
    "Confirming creates a customer with no password. It does not edit any existing person.",
  ], {
    pending: {
      toolName: "create_customer",
      summary: `Create customer ${draft.email}.`,
      payload: { email: draft.email, name: draft.name, phone: draft.phone },
    },
  });
}

function draftMessage(request: string, context: BackofficeContext): AssistantFact {
  const name = context.lastCustomerName ?? "there";
  const about = request.replace(/prepare a message|draft a message|write a message|for a customer/gi, "").trim();
  const english = `Hello ${name},\n\n${about || "I am writing from SiamEZ with an update on your service."}\n\nPlease reply if you need a different time or any other help.\n\nSiamEZ`;
  const thai = `สวัสดีค่ะ/ครับ ${name}\n\n${about || "SiamEZ ขออัปเดตเรื่องบริการของคุณ"}\n\nหากต้องการเปลี่ยนเวลานัดหรือความช่วยเหลือเพิ่มเติม ตอบกลับข้อความนี้ได้เลยค่ะ/ครับ\n\nSiamEZ`;
  return fact("Draft only. This message has not been sent.", [
    english,
    "",
    thai,
    "",
    "Ask me to send a reminder if you want email to go out. That still needs confirmation.",
  ]);
}

async function documentReview(query: string | null, context: BackofficeContext): Promise<AssistantFact> {
  const caseNumber = query?.match(/[A-Z]{2,}-\d{4}-[A-Z0-9]+/i)?.[0];
  const row = caseNumber
    ? await prisma.case.findFirst({
        where: { caseNumber: { equals: caseNumber, mode: "insensitive" } },
        select: { id: true, caseNumber: true },
      })
    : context.lastCaseId
      ? await prisma.case.findUnique({ where: { id: context.lastCaseId }, select: { id: true, caseNumber: true } })
      : null;
  if (!row) return fact("Which booking should I check?", ["Give a case number, or open the customer first. I did not guess a document."]);
  const documents = await prisma.document.findMany({
    where: { caseId: row.id },
    select: { name: true, mimeType: true, documentType: true },
    take: 8,
  });
  const extracted: ExtractedDoc[] = [];
  for (const document of documents) {
    const result = await extractDocumentFields({
      fileName: document.name,
      mimeType: document.mimeType ?? undefined,
      documentType: document.documentType ?? undefined,
    });
    extracted.push({
      label: document.name,
      fields: result.fields,
      ocrApplied: result.ocrApplied,
      warnings: result.warnings,
    });
  }
  const review = reviewExtractedDocuments(extracted);
  return fact(`Document check for ${row.caseNumber}.`, review.lines, {
    links: [{ href: `/admin/cases/${row.id}`, label: row.caseNumber }],
    context: { lastCaseId: row.id, lastCaseNumber: row.caseNumber },
  });
}

async function knowledge(query: string): Promise<AssistantFact> {
  const articles = await prisma.backofficeKnowledgeArticle.findMany({
    where: { active: true },
    select: { slug: true, title: true, body: true, category: true, priority: true },
    take: 50,
  });
  const ranked = rankKnowledge(articles, query, 3);
  if (ranked.length === 0) {
    return fact("I don't have that in the approved knowledge base or in a matching record.", [
      "Add it under Knowledge if staff should rely on it. I will not guess a policy or a price.",
    ]);
  }
  return fact("From the approved knowledge base.", ranked.flatMap((article) => [article.title, article.body, ""]));
}

async function dailyReport(reportKind: "morning" | "eod"): Promise<AssistantFact> {
  const snapshot = await getOperationsSnapshot(reportKind);
  return fact(reportKind === "eod" ? "End-of-day snapshot." : "Morning operations snapshot.", [
    `Bookings today: ${snapshot.todayBookings}.`,
    `Unconfirmed: ${snapshot.unconfirmedBookings}.`,
    `Outstanding balances: ${formatSatang(snapshot.outstandingPaymentsSatang)} across ${snapshot.outstandingPaymentCount} invoice${snapshot.outstandingPaymentCount === 1 ? "" : "s"}.`,
    `Missing document checklists: ${snapshot.missingDocuments}.`,
    `Open quotations: ${snapshot.openQuotes}.`,
    `Licence renewals this month: ${snapshot.renewalsThisMonth}. Overdue: ${snapshot.overdueRenewals}.`,
    `Vehicle sourcing leads: ${snapshot.vehicleSourcingOpen}.`,
    `Tasks due or overdue: ${snapshot.followUpsDue}. Overdue: ${snapshot.overdueTasks}.`,
    `New customers today: ${snapshot.newCustomersToday}.`,
    `Approved revenue today: ${formatSatang(snapshot.revenueTodaySatang)}.`,
    ...snapshot.recommendations,
  ]);
}

export type OperationsSnapshot = {
  generatedAt: string;
  timezone: "Asia/Bangkok";
  kind: "morning" | "eod";
  pendingBookings: number;
  unconfirmedBookings: number;
  outstandingPaymentsSatang: number;
  outstandingPaymentCount: number;
  missingDocuments: number;
  renewalsThisMonth: number;
  renewalsNextMonth: number;
  overdueRenewals: number;
  followUpsDue: number;
  overdueTasks: number;
  openQuotes: number;
  vehicleSourcingOpen: number;
  todayBookings: number;
  newCustomersToday: number;
  revenueTodaySatang: number;
  recommendations: string[];
};

export async function getOperationsSnapshot(kind: "morning" | "eod"): Promise<OperationsSnapshot> {
  const today = bangkokRange("today");
  const todayDate = toUtcDateOnly(todayInBangkok());
  const renewalRows = await prisma.driverLicenseRenewal.findMany({
    where: { status: { notIn: [...CLOSED_RENEWAL] } },
    select: { nextRenewalDate: true },
    take: 400,
  });
  const todayKey = today.key;
  const thisMonth = monthBounds(0);
  const nextMonth = monthBounds(1);
  const stamp = (date: Date) =>
    dateKeyFromParts({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() });
  const keys = renewalRows.map((row) => stamp(row.nextRenewalDate));
  const [pendingBookings, unconfirmedBookings, receivables, docCases, followUpsDue, overdueTasks, openQuotes, vehicleSourcingOpen, todayBookings, newCustomersToday, revenueTodaySatang] =
    await Promise.all([
      prisma.case.count({ where: { status: { notIn: [...CLOSED_CASE] } } }),
      prisma.case.count({ where: { status: { in: ["new", "under_review"] } } }),
      listReceivables(),
      prisma.case.findMany({
        where: { status: { notIn: [...CLOSED_CASE] }, documentsRequired: { not: Prisma.DbNull } },
        select: { documentsRequired: true, documents: { select: { name: true, documentType: true } } },
        take: 80,
      }),
      prisma.followUp.count({ where: { status: { in: OPEN_FOLLOW_UP_STATUSES }, dueDate: { lte: todayDate } } }),
      prisma.followUp.count({ where: { status: { in: ["PENDING", "DUE", "IN_PROGRESS"] }, dueDate: { lt: todayDate } } }),
      prisma.quote.count({ where: { status: { in: ["draft", "generated", "sent", "viewed"] } } }),
      prisma.vehicleLead.count({ where: { type: "buy", status: { notIn: ["completed", "cancelled", "sold_or_purchased"] } } }),
      prisma.case.count({ where: { scheduledAt: { gte: today.start, lte: today.end }, status: { not: "cancelled" } } }),
      prisma.user.count({ where: { role: "customer", createdAt: { gte: today.start, lte: today.end } } }),
      approvedTotal("today"),
    ]);
  const owing = receivables.filter((row) => row.outstanding > 0);
  const missingDocuments = docCases.filter((row) => missingRequiredDocuments(row.documentsRequired, row.documents).length > 0).length;
  const renewalsThisMonth = keys.filter((key) => key >= thisMonth.startKey && key <= thisMonth.endKey).length;
  const renewalsNextMonth = keys.filter((key) => key >= nextMonth.startKey && key <= nextMonth.endKey).length;
  const overdueRenewals = keys.filter((key) => key < todayKey).length;
  const recommendations: string[] = [];
  if (unconfirmedBookings > 0) recommendations.push(`${unconfirmedBookings} booking${unconfirmedBookings === 1 ? "" : "s"} still need confirmation.`);
  if (overdueTasks > 0) recommendations.push(`${overdueTasks} staff task${overdueTasks === 1 ? "" : "s"} are overdue.`);
  if (overdueRenewals > 0) recommendations.push(`${overdueRenewals} licence renewal${overdueRenewals === 1 ? "" : "s"} are past the recorded expiry.`);
  if (missingDocuments > 0) recommendations.push(`${missingDocuments} open booking${missingDocuments === 1 ? "" : "s"} still list missing documents.`);
  if (recommendations.length === 0) recommendations.push("No urgent exception stood out from these counts.");
  return {
    generatedAt: new Date().toISOString(),
    timezone: "Asia/Bangkok",
    kind,
    pendingBookings,
    unconfirmedBookings,
    outstandingPaymentsSatang: owing.reduce((sum, row) => sum + row.outstanding, 0),
    outstandingPaymentCount: owing.length,
    missingDocuments,
    renewalsThisMonth,
    renewalsNextMonth,
    overdueRenewals,
    followUpsDue,
    overdueTasks,
    openQuotes,
    vehicleSourcingOpen,
    todayBookings,
    newCustomersToday,
    revenueTodaySatang,
    recommendations,
  };
}

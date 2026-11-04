import { prisma } from "@/lib/db";
import { formatSatang, formatWhen } from "@/lib/backoffice/format";
import type { BackofficeIntent } from "@/lib/backoffice/intent";
import {
  buildBriefing,
  customersNotContacted,
  detectBottlenecks,
  profitReport,
  serviceDemand,
  staffWorkload,
} from "@/lib/backoffice/intelligence";
import { draftPaymentReminder, type PaymentReminderDraft } from "@/lib/backoffice/parse";
import { listReceivables } from "@/lib/finance/summaries";
import type { AssistantFact, BackofficeContext, BackofficeRole } from "@/lib/backoffice/types";

function fact(title: string, lines: string[], extra?: Partial<AssistantFact>): AssistantFact {
  return { title, lines, links: extra?.links ?? [], context: extra?.context, pending: extra?.pending };
}

export async function answerCommand(
  intent: BackofficeIntent,
  context: BackofficeContext,
  role: BackofficeRole
): Promise<AssistantFact | null> {
  switch (intent.kind) {
    case "payment_reminders":
      return paymentReminders(intent.scope, context);
    case "tasks_for_staff":
      return tasksForStaff(intent.name);
    case "customer_balance":
      return customerBalance(context);
    case "profit":
      return profitReport(role).then((report) => fact(report.title, report.lines));
    case "bottlenecks":
      return bottlenecks();
    case "briefing":
      return briefing(role);
    case "staff_workload":
      return staffWorkload().then((report) => fact(report.title, report.lines, { links: [{ href: "/admin/followups", label: "Open follow-ups" }] }));
    case "service_demand":
      return serviceDemand().then((report) => fact(report.title, report.lines));
    case "not_contacted":
      return customersNotContacted().then((report) => fact(report.title, report.lines));
    default:
      return null;
  }
}

async function paymentReminders(scope: "all" | "context", context: BackofficeContext): Promise<AssistantFact> {
  const rows = (await listReceivables()).filter((row) => row.outstanding > 0);
  const scoped =
    scope === "context" && (context.lastCaseId || context.lastCustomerName)
      ? rows.filter((row) => row.caseId === context.lastCaseId || (context.lastCustomerName ? row.customerName.toLowerCase().includes(context.lastCustomerName.toLowerCase()) : false))
      : rows;
  const chosen = scoped.slice(0, 20);
  if (chosen.length === 0) {
    return fact("No outstanding balance matched.", ["Nothing was drafted or sent."]);
  }
  const invoices = await prisma.invoice.findMany({
    where: { id: { in: chosen.map((row) => row.invoiceId) } },
    select: { id: true, userId: true, user: { select: { email: true, name: true } }, case: { select: { guestEmail: true, guestName: true } } },
  });
  const byId = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const drafts: PaymentReminderDraft[] = [];
  for (const row of chosen) {
    const invoice = byId.get(row.invoiceId);
    const email = invoice?.user?.email || invoice?.case.guestEmail || "";
    if (!email.includes("@")) continue;
    drafts.push({
      invoiceId: row.invoiceId,
      caseId: row.caseId,
      caseNumber: row.caseNumber,
      email,
      name: invoice?.user?.name || invoice?.case.guestName || row.customerName,
      outstandingSatang: row.outstanding,
    });
  }
  const lines = [
    "Steps: find the remaining balance, draft one reminder each, and wait for confirmation before sending.",
    ...chosen.map((row) => `${row.caseNumber} · ${row.customerName} · outstanding ${formatSatang(row.outstanding)}`),
  ];
  if (drafts.length === 0) return fact(`${chosen.length} outstanding balance${chosen.length === 1 ? "" : "s"} have no email address.`, lines);
  lines.push(...drafts.slice(0, 3).map((draft) => draftPaymentReminder(draft)));
  return fact(`Prepared ${drafts.length} payment reminder${drafts.length === 1 ? "" : "s"}. Nothing has been sent.`, lines, {
    context: { lastCaseId: drafts[0]!.caseId, lastCaseNumber: drafts[0]!.caseNumber, lastCustomerId: byId.get(drafts[0]!.invoiceId)?.userId ?? null, lastCustomerName: drafts[0]!.name },
    pending: {
      toolName: "send_payment_reminders",
      summary: `Send ${drafts.length} payment reminder${drafts.length === 1 ? "" : "s"}. Balances are checked again before sending.`,
      payload: { invoiceIds: drafts.map((draft) => draft.invoiceId) },
    },
  });
}

async function tasksForStaff(name: string): Promise<AssistantFact> {
  const staff = await prisma.user.findMany({
    where: { role: { in: ["admin", "staff"] }, name: { contains: name, mode: "insensitive" }, active: true },
    select: { id: true, name: true, email: true },
    take: 5,
  });
  if (staff.length === 0) return fact(`No active staff member matched “${name}”.`, []);
  const rows = await prisma.followUp.findMany({
    where: { assignedStaffId: { in: staff.map((person) => person.id) }, status: { in: ["PENDING", "DUE", "IN_PROGRESS"] } },
    orderBy: { dueDate: "asc" },
    take: 20,
    select: { title: true, dueDate: true, client: { select: { name: true, email: true } } },
  });
  if (rows.length === 0) return fact(`${staff.map((person) => person.name || person.email).join(", ")} has no open tasks.`, []);
  return fact(`Open tasks for ${staff.map((person) => person.name || person.email).join(", ")}.`, rows.map((row) => `${formatWhen(row.dueDate)} · ${row.title} · ${row.client.name ?? row.client.email}`));
}

async function customerBalance(context: BackofficeContext): Promise<AssistantFact> {
  if (!context.lastCustomerId && !context.lastCaseId) return fact("Which customer do you mean?", ["Ask about a customer first, then ask what they owe."]);
  const invoices = await prisma.invoice.findMany({
    where: context.lastCaseId ? { caseId: context.lastCaseId } : { userId: context.lastCustomerId ?? undefined },
    select: { amount: true, case: { select: { caseNumber: true } }, payments: { where: { status: "approved" }, select: { amount: true } } },
  });
  if (invoices.length === 0) return fact(`${context.lastCustomerName ?? "This customer"} has no invoice on this record.`, ["I did not estimate a balance."]);
  const total = invoices.reduce((sum, invoice) => sum + Math.max(0, invoice.amount - invoice.payments.reduce((paid, payment) => paid + payment.amount, 0)), 0);
  return fact(`${context.lastCustomerName ?? "This customer"} owes ${formatSatang(total)}.`, invoices.map((invoice) => {
    const paid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
    return `${invoice.case?.caseNumber ?? "invoice"}: outstanding ${formatSatang(Math.max(0, invoice.amount - paid))}.`;
  }));
}

async function bottlenecks(): Promise<AssistantFact> {
  const found = await detectBottlenecks();
  if (found.length === 0) return fact("No delay stood out in the current records.", []);
  return fact("Where bookings are getting delayed.", found.map((item) => `${item.problem} ${item.count} record${item.count === 1 ? "" : "s"}, ${item.age}. Area: ${item.area}. ${item.action}`));
}

async function briefing(role: BackofficeRole): Promise<AssistantFact> {
  const report = await buildBriefing(role);
  return fact(report.title, [...report.lines, ...report.bottlenecks.map((item) => `Delay: ${item.problem} ${item.count}. ${item.action}`), "Priorities:", ...report.priorities]);
}

import { z } from "zod";
import { prisma } from "@/lib/db";
import { createQuote } from "@/data-access/quote";
import { sendEmail } from "@/lib/email/send";
import { createFollowUp } from "@/lib/follow-ups/service";
import { endOfBangkokDay, startOfBangkokDay } from "@/lib/finance/dates";
import type { BackofficeActor } from "@/lib/backoffice/types";
import { isConfirmableTool } from "@/lib/backoffice/types";
import { buildReminderPlan, draftPaymentReminder, reminderBody, type PaymentReminderDraft, type ReminderBooking } from "@/lib/backoffice/parse";
import { formatWhen } from "@/lib/backoffice/format";
import { BackofficeError } from "@/lib/backoffice/auth";
import { executeWorkTool } from "@/lib/backoffice/operate";

const followUpSchema = z.object({
  clientId: z.string().min(1),
  caseId: z.string().min(1).nullable().optional(),
  title: z.string().min(3).max(180),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  assignedStaffId: z.string().min(1).nullable().optional(),
  followUpType: z
    .enum([
      "CUSTOM",
      "CLIENT_CONTACT",
      "DOCUMENT_REQUEST",
      "PAYMENT",
      "SERVICE_COMPLETION",
      "RENEWAL",
      "REVIEW",
      "CHECK_IN",
      "SALES",
      "QUOTE",
      "APPOINTMENT",
      "OTHER",
    ])
    .optional(),
});

const quoteSchema = z.object({
  serviceId: z.string().min(1),
  userId: z.string().min(1).nullable().optional(),
  amountSatang: z.number().int().positive(),
  notes: z.string().max(500).optional(),
  lines: z
    .array(z.object({ code: z.string().min(1), name: z.string().min(1), amountSatang: z.number().int().nonnegative() }))
    .min(1)
    .max(12),
});

const reminderSchema = z.object({
  caseIds: z.array(z.string().min(1)).min(1).max(50),
  whenKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const paymentReminderSchema = z.object({
  invoiceIds: z.array(z.string().min(1)).min(1).max(20),
});

const customerSchema = z.object({
  email: z.string().email().max(200),
  name: z.string().min(1).max(120).nullable().optional(),
  phone: z.string().min(6).max(30).nullable().optional(),
});

function assertOwner(actor: BackofficeActor, staffId: string | null) {
  if (!staffId || !actor.id || staffId === actor.id || actor.role === "admin") return;
  throw new BackofficeError("Only the staff member who asked, or an administrator, can confirm this.", 403);
}

export async function resolvePendingAction(input: {
  actor: BackofficeActor;
  actionId: string;
  decision: "confirm" | "reject";
}): Promise<{ summary: string; href?: string }> {
  const action = await prisma.backofficePendingAction.findUnique({ where: { id: input.actionId } });
  if (!action || !isConfirmableTool(action.toolName)) {
    throw new BackofficeError("That action is not waiting for confirmation.", 404);
  }
  assertOwner(input.actor, action.staffId);
  if (action.status !== "pending") {
    throw new BackofficeError("That action was already resolved.", 409);
  }
  if (action.expiresAt.getTime() < Date.now()) {
    await prisma.backofficePendingAction.update({
      where: { id: action.id },
      data: { status: "expired", resolvedAt: new Date() },
    });
    throw new BackofficeError("That confirmation expired. Ask again.", 409);
  }
  if (input.decision === "reject") {
    await prisma.backofficePendingAction.update({
      where: { id: action.id },
      data: { status: "rejected", resolvedAt: new Date() },
    });
    return { summary: "Cancelled. Nothing was changed or sent." };
  }

  const result = await executeConfirmed(action.toolName, action.payload, input.actor);
  await prisma.backofficePendingAction.update({
    where: { id: action.id },
    data: { status: "confirmed", resolvedAt: new Date() },
  });
  await prisma.backofficeAuditLog.create({
    data: {
      conversationId: action.conversationId,
      staffId: input.actor.id,
      actorEmail: input.actor.email,
      actorRole: input.actor.role,
      action: action.toolName,
      status: "confirmed",
      summary: result.summary,
      entityType: result.entityType ?? null,
      entityId: result.entityId ?? null,
    },
  });
  return { summary: result.summary, href: result.href };
}

async function executeConfirmed(
  toolName: string,
  payload: unknown,
  actor: BackofficeActor
): Promise<{ summary: string; href?: string; entityType?: string; entityId?: string }> {
  if (toolName === "create_follow_up") {
    const data = followUpSchema.parse(payload);
    const followUp = await createFollowUp({
      clientId: data.clientId,
      caseId: data.caseId ?? null,
      title: data.title,
      dueDate: data.dueDate,
      assignedStaffId: data.assignedStaffId ?? null,
      followUpType: data.followUpType ?? "CLIENT_CONTACT",
      emailReminderEnabled: false,
      description: "Created by the SiamEZ AI assistant after staff confirmation. Customer email was not sent.",
    });
    return {
      summary: `Follow-up saved. Customer email was not sent.`,
      href: `/admin/followups/${followUp.id}`,
      entityType: "follow_up",
      entityId: followUp.id,
    };
  }

  if (toolName === "save_draft_quote") {
    const data = quoteSchema.parse(payload);
    const catalogue = await prisma.backofficePriceItem.findMany({
      where: { code: { in: data.lines.map((line) => line.code) }, active: true },
    });
    const byCode = new Map(catalogue.map((item) => [item.code, item]));
    const repriced = data.lines.map((line) => {
      const current = byCode.get(line.code);
      if (!current) throw new BackofficeError(`Catalogue price ${line.code} is no longer active.`, 409);
      return { code: current.code, name: current.name, amountSatang: current.amountSatang };
    });
    const total = repriced.reduce((sum, line) => sum + line.amountSatang, 0);
    if (total !== data.amountSatang) {
      throw new BackofficeError("The catalogue price changed. Ask for the quotation again.", 409);
    }
    const quote = await createQuote({
      serviceId: data.serviceId,
      userId: data.userId ?? null,
      amount: total,
      status: "draft",
      quoteType: "fixed",
      notes: data.notes,
      subtotal: total,
      pricingBreakdown: repriced,
      pricingSnapshot: { source: "backoffice_price_items", lines: repriced },
      pricingVersion: "backoffice-catalogue",
      requiresHumanReview: true,
      aiConfidence: null,
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });
    return {
      summary: `Draft quotation ${quote.quoteNumber ?? quote.id} saved. It has not been sent.`,
      href: `/admin/quotes/${quote.id}`,
      entityType: "quote",
      entityId: quote.id,
    };
  }

  if (toolName === "create_customer") {
    const data = customerSchema.parse(payload);
    const email = data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw new BackofficeError("That email already exists. I did not change it.", 409);
    const user = await prisma.user.create({
      data: {
        email,
        name: data.name ?? null,
        phone: data.phone ?? null,
        role: "customer",
      },
      select: { id: true, email: true },
    });
    return {
      summary: `Customer ${user.email} created. No existing record was overwritten.`,
      href: `/admin/clients/${user.id}`,
      entityType: "user",
      entityId: user.id,
    };
  }

  if (toolName === "send_payment_reminders") {
    const data = paymentReminderSchema.parse(payload);
    const invoices = await prisma.invoice.findMany({
      where: { id: { in: data.invoiceIds } },
      select: {
        id: true,
        amount: true,
        caseId: true,
        user: { select: { email: true, name: true } },
        case: { select: { caseNumber: true, guestEmail: true, guestName: true } },
        payments: { where: { status: "approved" }, select: { amount: true } },
      },
    });
    const drafts: PaymentReminderDraft[] = [];
    for (const invoice of invoices) {
      const paid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const outstanding = Math.max(0, invoice.amount - paid);
      const email = invoice.user?.email || invoice.case.guestEmail || "";
      if (outstanding <= 0 || !email.includes("@")) continue;
      drafts.push({
        invoiceId: invoice.id,
        caseId: invoice.caseId,
        caseNumber: invoice.case.caseNumber,
        email,
        name: invoice.user?.name || invoice.case.guestName || "there",
        outstandingSatang: outstanding,
      });
    }
    if (drafts.length === 0) throw new BackofficeError("Those balances are already clear, or there is no email address. Nothing was sent.", 409);
    let sent = 0;
    let failed = 0;
    let skipped = false;
    for (const draft of drafts) {
      const body = draftPaymentReminder(draft);
      const result = await sendEmail({
        to: draft.email,
        subject: `SiamEZ payment reminder — ${draft.caseNumber}`,
        text: body,
        html: `<pre>${body.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`,
      });
      if (result.ok) sent += 1;
      else if (result.skipped) skipped = true;
      else failed += 1;
    }
    if (skipped && sent === 0) throw new BackofficeError("Email is not configured, so no payment reminder was sent.", 409);
    return { summary: `Payment reminders sent: ${sent}. Failed: ${failed}.`, entityType: "invoice", entityId: drafts[0]?.invoiceId };
  }

  if (toolName === "send_appointment_reminders") {
    const data = reminderSchema.parse(payload);
    const start = startOfBangkokDay(data.whenKey);
    const end = endOfBangkokDay(data.whenKey);
    const rows = await prisma.case.findMany({
      where: {
        id: { in: data.caseIds },
        scheduledAt: { gte: start, lte: end },
        status: { notIn: ["cancelled", "completed"] },
      },
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
    });
    const bookings: ReminderBooking[] = rows
      .map((row) => ({
        caseId: row.id,
        caseNumber: row.caseNumber,
        email: row.user?.email || row.guestEmail || "",
        name: row.user?.name || row.guestName || "there",
        whenLabel: formatWhen(row.scheduledAt),
        service: row.service?.name ?? row.otherServiceName ?? "appointment",
      }))
      .filter((row) => row.email.includes("@"));
    const plan = buildReminderPlan(bookings);
    if (plan.bookings.length === 0) {
      throw new BackofficeError("Those bookings no longer have an email address for that day. Nothing was sent.", 409);
    }
    let sent = 0;
    let failed = 0;
    let skipped = false;
    for (const booking of plan.bookings) {
      const body = reminderBody(booking);
      const result = await sendEmail({
        to: booking.email,
        subject: plan.subject,
        text: body,
        html: `<pre>${body.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`,
      });
      if (result.ok) sent += 1;
      else if (result.skipped) skipped = true;
      else failed += 1;
    }
    if (skipped && sent === 0) {
      throw new BackofficeError("Email is not configured, so no reminder was sent.", 409);
    }
    return {
      summary: `Reminders sent: ${sent}. Failed: ${failed}.`,
      entityType: "case",
      entityId: plan.bookings[0]?.caseId,
    };
  }

  if (
    toolName === "create_job" ||
    toolName === "create_invoice" ||
    toolName === "revise_invoice" ||
    toolName === "update_customer" ||
    toolName === "update_case_status" ||
    toolName === "assign_case" ||
    toolName === "run_work_plan"
  ) {
    return executeWorkTool(toolName, payload as Record<string, unknown>, actor.id);
  }

  throw new BackofficeError("That action is not available.", 400);
}

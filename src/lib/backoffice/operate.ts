import { Prisma, type CaseStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { nextCaseNumber } from "@/lib/utils";
import { formatSatang } from "@/lib/backoffice/format";
import type { BackofficeIntent } from "@/lib/backoffice/intent";
import { enqueueBookingWorkflow } from "@/lib/backoffice/enqueue";
import { BackofficeError } from "@/lib/backoffice/auth";
import { parseAssigneeName, parseExplicitDateKey } from "@/lib/backoffice/parse";
import { priceSelection, selectPriceCodes, type PriceCatalogueItem } from "@/lib/backoffice/pricing";
import { isToolEnabled, loadAiSettings, completeChat } from "@/lib/backoffice/providers";
import {
  applyDiscount,
  describeSteps,
  discountDecision,
  invoiceChangeMode,
  parseBahtSatang,
  parseCaseStatus,
  parseCustomerEdits,
  parseDiscount,
  serviceNeedle,
} from "@/lib/backoffice/operations";
import { fillTemplate, recommendTemplate, translationKeepsFacts } from "@/lib/backoffice/sales-templates";
import { startOfBangkokDay, endOfBangkokDay } from "@/lib/finance/dates";
import { todayInBangkok } from "@/lib/follow-ups/dates";
import { dateKeyFromParts } from "@/lib/backoffice/format";
import type { AssistantFact, BackofficeContext, BackofficeRole } from "@/lib/backoffice/types";

function fact(title: string, lines: string[], extra?: Partial<AssistantFact>): AssistantFact {
  return { title, lines, links: extra?.links ?? [], context: extra?.context, pending: extra?.pending };
}

export async function proposeOperation(
  intent: BackofficeIntent,
  context: BackofficeContext,
  role: BackofficeRole,
  actorId: string | null
): Promise<AssistantFact | null> {
  switch (intent.kind) {
    case "create_job":
      return gate(await proposeJob(intent.request, context, false));
    case "create_invoice":
      return gate(await proposeInvoice(intent.request, context, role));
    case "revise_invoice":
      return gate(await proposeRevision(intent.request, context, role));
    case "update_customer":
      return gate(await proposeCustomerUpdate(intent.request, context));
    case "update_case_status":
      return gate(await proposeStatus(intent.request, context));
    case "assign_case":
      return gate(await proposeAssignment(intent.request, context));
    case "work_plan":
      return gate(await proposePlan(intent.request, context, role));
    case "my_tasks":
      return myTasks(actorId);
    case "completed_work":
      return completedToday();
    case "sales_help":
      return salesHelp(intent.request, context);
    default:
      return null;
  }
}

async function gate(proposed: AssistantFact): Promise<AssistantFact> {
  const tool = proposed.pending?.toolName;
  if (!tool) return proposed;
  const settings = await loadAiSettings();
  if (isToolEnabled(settings, tool)) return proposed;
  return fact("An administrator has turned this action off.", ["Nothing was changed or sent."]);
}

async function proposeJob(request: string, context: BackofficeContext, insidePlan: boolean): Promise<AssistantFact> {
  const customer = await resolveCustomer(request, context);
  if (!customer) return fact("Which customer is this job for?", ["Open the customer in this chat, or name a customer who already has a record. I did not create a job."]);
  const service = await resolveService(request);
  if (!service) return fact("Which service should this job use?", ["Name a service such as marriage registration, a driving licence, police clearance, translation, or a vehicle service. I did not create a job."]);
  const assignee = await resolveStaff(parseAssigneeName(request));
  if (assignee === "missing") return fact("I could not find that staff member.", ["I did not assign the job to someone else."]);
  const deadline = parseExplicitDateKey(request);
  const lines = [
    `Customer: ${customer.name}`,
    `Service: ${service.name}`,
    `Assign: ${assignee?.name ?? "leave unassigned"}`,
    `Deadline: ${deadline ?? "none stated"}`,
    "Confirmation creates the job, then the booking workflow drafts the checklist. No customer message is sent.",
  ];
  return fact("New job ready for confirmation.", lines, {
    context: { ...context, lastCustomerId: customer.id, lastCustomerName: customer.name },
    pending: insidePlan
      ? undefined
      : {
          toolName: "create_job",
          summary: `Create a ${service.name} job for ${customer.name}.`,
          payload: { userId: customer.id, serviceId: service.id, assigneeId: assignee?.id ?? null, deadlineKey: deadline },
        },
  });
}

async function proposeInvoice(request: string, context: BackofficeContext, role: BackofficeRole): Promise<AssistantFact> {
  const booking = await resolveCase(context);
  if (!booking) return fact("Which job should this invoice belong to?", ["Open the booking first. An invoice has to be saved on a job. I did not create one."]);
  const priced = await priceRequest(request, booking.servicePrice);
  if (!priced) return fact("I could not find a price for that invoice.", ["State the amount in baht, or name a service that is in the price catalogue. I did not invent a figure."]);
  const discount = parseDiscount(request);
  const decision = discountDecision(role, discount);
  if (decision === "refuse") return fact("A discount needs an administrator.", ["I did not change the price or save an invoice."]);
  const amount = decision === "apply" ? applyDiscount(priced.amountSatang, discount) : priced.amountSatang;
  if (!amount) return fact("That discount would remove the whole price.", ["I did not save an invoice."]);
  const lines = [
    `Job: ${booking.caseNumber}`,
    ...priced.lines.map((line) => `${line.name}: ${formatSatang(line.amountSatang)}`),
    `Draft total: ${formatSatang(amount)}.`,
    "Confirmation saves a draft invoice. It is not sent.",
  ];
  return fact("Draft invoice ready for confirmation.", lines, {
    context: { ...context, lastCaseId: booking.id, lastCaseNumber: booking.caseNumber },
    pending: {
      toolName: "create_invoice",
      summary: `Save a draft invoice for ${formatSatang(amount)} on ${booking.caseNumber}.`,
      payload: { caseId: booking.id, userId: booking.userId, amountSatang: amount, lines: priced.lines, reason: request.slice(0, 300) },
    },
  });
}

async function proposeRevision(request: string, context: BackofficeContext, role: BackofficeRole): Promise<AssistantFact> {
  const invoice = await resolveInvoice(context);
  if (!invoice) return fact("Which invoice should change?", ["Open the job first. I did not edit an invoice."]);
  const adding = /add /.test(request.toLowerCase());
  const stated = parseBahtSatang(request);
  const catalogue = adding ? await catalogueTotal(request) : null;
  if (adding && !catalogue) return fact("That service is not in the price catalogue.", ["I did not add a guessed price to the invoice."]);
  const proposed = adding && catalogue ? invoice.amount + catalogue.amountSatang : stated;
  if (!proposed) return fact("State the new amount in baht, or name a catalogue service to add.", ["I did not change the invoice."]);
  const discount = parseDiscount(request);
  if (discountDecision(role, discount) === "refuse") return fact("A discount needs an administrator.", ["I did not change the invoice."]);
  const amount = discount && role === "admin" ? applyDiscount(proposed, discount) : proposed;
  if (!amount) return fact("That discount would remove the whole price.", ["I did not change the invoice."]);
  const mode = invoiceChangeMode(invoice.status);
  const lines = [
    `${invoice.number} is ${invoice.status}. Current amount: ${formatSatang(invoice.amount)}.`,
    `Proposed amount: ${formatSatang(amount)}.`,
    mode === "update_draft"
      ? "Confirmation updates this draft and records the revision."
      : "This invoice has already been issued. Confirmation leaves it unchanged, records the revision, and saves a separate draft.",
  ];
  return fact("Invoice change waiting for approval.", lines, {
    context,
    pending: {
      toolName: "revise_invoice",
      summary: `Approve ${formatSatang(amount)} for ${invoice.number}. The current invoice is ${invoice.status}.`,
      payload: { invoiceId: invoice.id, previousAmount: invoice.amount, proposedAmount: amount, reason: request.slice(0, 300) },
    },
  });
}

async function proposeCustomerUpdate(request: string, context: BackofficeContext): Promise<AssistantFact> {
  const edits = parseCustomerEdits(request);
  if (!edits) return fact("Tell me the new name, email, or phone.", ["I did not change the customer."]);
  if (!context.lastCustomerId) return fact("Which customer should I update?", ["Open the customer in this chat first. I did not change a record."]);
  const user = await prisma.user.findUnique({ where: { id: context.lastCustomerId }, select: { id: true, name: true, email: true, phone: true, role: true } });
  if (!user || user.role !== "customer") return fact("That record is not a customer.", ["I did not change it."]);
  const lines = [
    edits.name ? `Name: ${user.name ?? "blank"} → ${edits.name}` : "",
    edits.email ? `Email: ${user.email} → ${edits.email}` : "",
    edits.phone ? `Phone: ${user.phone ?? "blank"} → ${edits.phone}` : "",
    "Other fields stay as they are. Confirmation saves this change.",
  ].filter(Boolean);
  return fact("Customer update ready for confirmation.", lines, {
    context,
    pending: { toolName: "update_customer", summary: `Update ${user.name ?? user.email}.`, payload: { userId: user.id, ...edits } },
  });
}

async function proposeStatus(request: string, context: BackofficeContext): Promise<AssistantFact> {
  const status = parseCaseStatus(request);
  if (!status) return fact("Which status should the job use?", ["Use confirmed, pending documents, in progress, completed, or cancelled. I did not change the job."]);
  if (!context.lastCaseId) return fact("Which job should change?", ["Open the job in this chat first."]);
  const booking = await prisma.case.findUnique({ where: { id: context.lastCaseId }, select: { id: true, caseNumber: true, status: true } });
  if (!booking) return fact("That job was not found.", ["I did not change a status."]);
  return fact("Job status ready for confirmation.", [
    `${booking.caseNumber}: ${booking.status} → ${status}.`,
    "Confirmation writes the status. It does not email the customer.",
  ], {
    context,
    pending: { toolName: "update_case_status", summary: `Set ${booking.caseNumber} to ${status}.`, payload: { caseId: booking.id, status } },
  });
}

async function proposeAssignment(request: string, context: BackofficeContext): Promise<AssistantFact> {
  const assignee = await resolveStaff(parseAssigneeName(request));
  if (!assignee || assignee === "missing") return fact("Which staff member should take this job?", ["Name someone on the staff list. I did not assign it."]);
  if (!context.lastCaseId) return fact("Which job should be assigned?", ["Open the job in this chat first."]);
  return fact("Assignment ready for confirmation.", [
    `${context.lastCaseNumber ?? "This job"} → ${assignee.name}.`,
    "Confirmation adds that person to the job. It does not remove anyone else.",
  ], {
    context,
    pending: { toolName: "assign_case", summary: `Assign ${context.lastCaseNumber ?? "the job"} to ${assignee.name}.`, payload: { caseId: context.lastCaseId, assigneeId: assignee.id } },
  });
}

async function proposePlan(request: string, context: BackofficeContext, role: BackofficeRole): Promise<AssistantFact> {
  const job = await proposeJob(request, context, true);
  if (job.pending === undefined && !job.lines.some((line) => line.startsWith("Customer:"))) return job;
  const customerId = job.context?.lastCustomerId;
  const serviceLine = job.lines.find((line) => line.startsWith("Service:"));
  if (!customerId || !serviceLine) return job;
  const service = await resolveService(request);
  const assignee = await resolveStaff(parseAssigneeName(request));
  if (assignee === "missing") return fact("I could not find that staff member.", ["I stopped before creating the job or invoice."]);
  const priced = await priceRequest(request, service?.priceAmount ?? null);
  const discount = parseDiscount(request);
  if (discountDecision(role, discount) === "refuse") return fact("A discount needs an administrator.", ["I did not start the job, invoice, or message."]);
  const amount = priced && discountDecision(role, discount) === "apply" ? applyDiscount(priced.amountSatang, discount) : priced?.amountSatang ?? null;
  const steps = describeSteps(["job", ...(amount ? ["invoice" as const] : []), ...(assignee ? ["assign" as const] : []), "message"]);
  return fact("I will do these steps after you confirm.", [
    ...steps,
    ...job.lines,
    amount ? `Draft invoice: ${formatSatang(amount)}.` : "No invoice amount was stated or found in the catalogue, so I will not create an invoice.",
    "The message stays a draft. Nothing is emailed.",
  ], {
    context: job.context,
    pending: {
      toolName: "run_work_plan",
      summary: `Create the job${amount ? `, draft ${formatSatang(amount)}` : ""}${assignee ? `, assign ${assignee.name}` : ""}, and draft the next-steps message.`,
      payload: {
        userId: customerId,
        serviceId: service?.id,
        assigneeId: assignee?.id ?? null,
        deadlineKey: parseExplicitDateKey(request),
        amountSatang: amount,
        lines: priced?.lines ?? [],
        templateId: "booking_confirmation",
      },
    },
  });
}

async function salesHelp(request: string, context: BackofficeContext): Promise<AssistantFact> {
  const template = recommendTemplate(request);
  const amount = parseBahtSatang(request);
  const draft = fillTemplate(template.body, {
    name: context.lastCustomerName ?? "there",
    service: serviceNeedle(request)?.source ?? "your SiamEZ service",
    caseNumber: context.lastCaseNumber ?? "",
    amount: amount ? formatSatang(amount) : "",
  });
  const wantsTranslation = /translat/.test(request.toLowerCase());
  let translated: string | null = null;
  if (wantsTranslation) {
    const target = /thai/.test(request.toLowerCase()) ? "Thai" : "English";
    const result = await completeChat("writing", [
      { role: "system", content: `Translate the draft into ${target}. Keep every number. Do not add prices, offers, or names that are not in the draft.` },
      { role: "user", content: draft },
    ]);
    if (result && translationKeepsFacts(draft, result.text)) translated = result.text;
  }
  const lines = [
    `Template: ${template.name}. ${template.purpose}`,
    "Edit this before sending. I have not sent it.",
    draft,
  ];
  if (wantsTranslation && translated) lines.push("Translation:", translated);
  if (wantsTranslation && !translated) lines.push("No writing model returned a translation that kept the original figures, so only the draft above is shown.");
  return fact("Sales draft ready to edit.", lines, { context });
}

async function myTasks(actorId: string | null): Promise<AssistantFact> {
  const today = dateKeyFromParts(todayInBangkok());
  if (!actorId) return fact("This session is not tied to a staff profile.", ["Ask “show everyone’s workload” to see the team list."]);
  const rows = await prisma.followUp.findMany({
    where: { assignedStaffId: actorId, status: { in: ["PENDING", "DUE", "IN_PROGRESS"] }, dueDate: { lte: endOfBangkokDay(today) } },
    orderBy: { dueDate: "asc" },
    take: 20,
    select: { title: true, dueDate: true, client: { select: { name: true, email: true } } },
  });
  if (rows.length === 0) return fact("You have no open task due today.", ["Nothing overdue was assigned to you either."]);
  return fact("Work assigned to you that is due today or overdue.", rows.map((row) => `${row.dueDate.toISOString().slice(0, 10)} · ${row.title} · ${row.client.name ?? row.client.email}`));
}

async function completedToday(): Promise<AssistantFact> {
  const today = dateKeyFromParts(todayInBangkok());
  const [jobs, tasks] = await Promise.all([
    prisma.case.findMany({
      where: { status: "completed", updatedAt: { gte: startOfBangkokDay(today), lte: endOfBangkokDay(today) } },
      select: { caseNumber: true, service: { select: { name: true } } },
      take: 20,
    }),
    prisma.followUp.findMany({
      where: { status: "COMPLETED", completedAt: { gte: startOfBangkokDay(today), lte: endOfBangkokDay(today) } },
      select: { title: true },
      take: 20,
    }),
  ]);
  if (jobs.length === 0 && tasks.length === 0) return fact("Nothing was marked completed today.", ["This uses job status updates and tasks completed since midnight in Asia/Bangkok."]);
  return fact("Completed today.", [
    ...jobs.map((job) => `${job.caseNumber} · ${job.service?.name ?? "service"}`),
    ...tasks.map((task) => task.title),
  ]);
}

type CustomerHit = { id: string; name: string };
type ServiceHit = { id: string; name: string; priceAmount: number | null };
type StaffHit = { id: string; name: string };

async function resolveCustomer(request: string, context: BackofficeContext): Promise<CustomerHit | null> {
  if (context.lastCustomerId) {
    const user = await prisma.user.findUnique({ where: { id: context.lastCustomerId }, select: { id: true, name: true, email: true, role: true } });
    if (user?.role === "customer") return { id: user.id, name: user.name ?? user.email };
  }
  const named = request.match(/\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/)?.[1];
  if (!named || /^(This|The|Grace|Jun)$/.test(named)) return null;
  const user = await prisma.user.findFirst({
    where: { role: "customer", name: { contains: named, mode: "insensitive" } },
    select: { id: true, name: true, email: true },
  });
  return user ? { id: user.id, name: user.name ?? user.email } : null;
}

async function resolveService(request: string): Promise<ServiceHit | null> {
  const needle = serviceNeedle(request);
  if (!needle) return null;
  const services = await prisma.service.findMany({ where: { active: true }, select: { id: true, name: true, slug: true, priceAmount: true }, take: 100 });
  const found = services.find((item) => needle.test(`${item.name} ${item.slug}`.toLowerCase()));
  return found ? { id: found.id, name: found.name, priceAmount: found.priceAmount } : null;
}

async function resolveStaff(name: string | null): Promise<StaffHit | "missing" | null> {
  if (!name) return null;
  const staff = await prisma.user.findFirst({
    where: { role: { in: ["admin", "staff"] }, active: true, name: { contains: name, mode: "insensitive" } },
    select: { id: true, name: true, email: true },
  });
  return staff ? { id: staff.id, name: staff.name ?? staff.email } : "missing";
}

async function resolveCase(context: BackofficeContext) {
  if (!context.lastCaseId && !context.lastCustomerId) return null;
  const booking = await prisma.case.findFirst({
    where: context.lastCaseId ? { id: context.lastCaseId } : { userId: context.lastCustomerId ?? undefined },
    orderBy: { createdAt: "desc" },
    select: { id: true, caseNumber: true, userId: true, service: { select: { priceAmount: true } } },
  });
  if (!booking) return null;
  return { id: booking.id, caseNumber: booking.caseNumber, userId: booking.userId, servicePrice: booking.service?.priceAmount ?? null };
}

async function resolveInvoice(context: BackofficeContext) {
  const booking = await resolveCase(context);
  if (!booking) return null;
  const invoice = await prisma.invoice.findFirst({ where: { caseId: booking.id }, orderBy: { createdAt: "desc" } });
  if (!invoice) return null;
  return { id: invoice.id, number: invoice.invoiceNumber ?? invoice.id.slice(0, 8), amount: invoice.amount, status: invoice.status };
}

async function catalogueTotal(request: string): Promise<{ amountSatang: number; lines: { code: string; name: string; amountSatang: number }[] } | null> {
  const catalogue = await prisma.backofficePriceItem.findMany({ where: { active: true }, select: { code: true, name: true, amountSatang: true, active: true } });
  const selection = priceSelection(selectPriceCodes(request), catalogue as PriceCatalogueItem[]);
  if (selection.lines.length === 0) return null;
  return { amountSatang: selection.totalSatang, lines: selection.lines };
}

async function priceRequest(request: string, servicePrice: number | null) {
  const stated = parseBahtSatang(request);
  if (stated) return { amountSatang: stated, lines: [{ code: "stated", name: "Stated amount", amountSatang: stated }] };
  const catalogue = await catalogueTotal(request);
  if (catalogue) return catalogue;
  if (servicePrice && servicePrice > 0) return { amountSatang: servicePrice, lines: [{ code: "service", name: "Service price", amountSatang: servicePrice }] };
  return null;
}

export async function createJobRecord(input: { userId: string; serviceId: string; assigneeId?: string | null; deadlineKey?: string | null; amountSatang?: number | null }) {
  const created = await prisma.case.create({
    data: {
      caseNumber: nextCaseNumber(),
      userId: input.userId,
      serviceId: input.serviceId,
      status: "new",
      dealValue: input.amountSatang ?? null,
    },
  });
  if (input.assigneeId) {
    await prisma.staffAssignment.create({ data: { caseId: created.id, userId: input.assigneeId, role: "primary" } });
  }
  if (input.deadlineKey) {
    const { createFollowUp } = await import("@/lib/follow-ups/service");
    await createFollowUp({
      clientId: input.userId,
      caseId: created.id,
      title: `Deadline for ${created.caseNumber}`,
      dueDate: input.deadlineKey,
      assignedStaffId: input.assigneeId ?? null,
      emailReminderEnabled: false,
      followUpType: "CUSTOM",
    });
  }
  enqueueBookingWorkflow(created.id);
  return created;
}

export async function createDraftInvoice(input: { caseId: string; userId?: string | null; amountSatang: number; lines: unknown; reason: string }) {
  const { enforceLicenceInvoiceGate } = await import("@/lib/licence-verification/billing-gate");
  await enforceLicenceInvoiceGate({ caseId: input.caseId });
  const invoiceNumber = await nextInvoiceNumber();
  return prisma.invoice.create({
    data: {
      invoiceNumber,
      caseId: input.caseId,
      userId: input.userId ?? undefined,
      amount: input.amountSatang,
      currency: "THB",
      status: "draft",
      lineItems: input.lines as Prisma.InputJsonValue,
    },
  });
}

async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await prisma.invoice.findMany({ where: { invoiceNumber: { startsWith: `INV-${year}-` } }, select: { invoiceNumber: true } });
  const max = rows.reduce((highest, row) => Math.max(highest, Number(row.invoiceNumber?.split("-").at(-1)) || 0), 0);
  return `INV-${year}-${String(max + 1).padStart(5, "0")}`;
}

export async function executeWorkTool(
  toolName: string,
  payload: Record<string, unknown>,
  actorId: string | null
): Promise<{ summary: string; href?: string; entityType?: string; entityId?: string }> {
  if (toolName === "create_job") {
    const created = await createJobRecord({
      userId: String(payload.userId),
      serviceId: String(payload.serviceId),
      assigneeId: stringOrNull(payload.assigneeId),
      deadlineKey: stringOrNull(payload.deadlineKey),
    });
    return { summary: `Created job ${created.caseNumber}.`, href: `/admin/cases/${created.id}`, entityType: "case", entityId: created.id };
  }
  if (toolName === "create_invoice") {
    const invoice = await createDraftInvoice({
      caseId: String(payload.caseId),
      userId: stringOrNull(payload.userId),
      amountSatang: Number(payload.amountSatang),
      lines: payload.lines,
      reason: String(payload.reason ?? ""),
    });
    return { summary: `Saved draft invoice ${invoice.invoiceNumber} for ${formatSatang(invoice.amount)}. It has not been sent.`, href: `/admin/invoices/${invoice.id}`, entityType: "invoice", entityId: invoice.id };
  }
  if (toolName === "revise_invoice") {
    return reviseInvoice(payload, actorId);
  }
  if (toolName === "update_customer") {
    const data: { name?: string; email?: string; phone?: string } = {};
    if (typeof payload.name === "string") data.name = payload.name;
    if (typeof payload.email === "string") data.email = payload.email;
    if (typeof payload.phone === "string") data.phone = payload.phone;
    const existing = await prisma.user.findFirst({ where: { id: String(payload.userId), role: "customer" }, select: { id: true } });
    if (!existing) throw new BackofficeError("That record is not a customer.", 404);
    const user = await prisma.user.update({ where: { id: existing.id }, data });
    return { summary: `Updated ${user.name ?? user.email}.`, entityType: "user", entityId: user.id };
  }
  if (toolName === "update_case_status") {
    const status = String(payload.status);
    const allowed = ["new", "under_review", "confirmed", "awaiting_payment", "pending_docs", "in_progress", "completed", "cancelled"];
    if (!allowed.includes(status)) throw new BackofficeError("That status is not one the assistant can set.", 400);
    const booking = await prisma.case.update({ where: { id: String(payload.caseId) }, data: { status: status as CaseStatus } });
    return { summary: `${booking.caseNumber} is now ${booking.status}.`, href: `/admin/cases/${booking.id}`, entityType: "case", entityId: booking.id };
  }
  if (toolName === "assign_case") {
    await prisma.staffAssignment.upsert({
      where: { caseId_userId: { caseId: String(payload.caseId), userId: String(payload.assigneeId) } },
      create: { caseId: String(payload.caseId), userId: String(payload.assigneeId), role: "primary" },
      update: { role: "primary" },
    });
    return { summary: "Assigned the staff member to the job.", entityType: "case", entityId: String(payload.caseId) };
  }
  if (toolName === "run_work_plan") {
    const created = await createJobRecord({
      userId: String(payload.userId),
      serviceId: String(payload.serviceId),
      assigneeId: stringOrNull(payload.assigneeId),
      deadlineKey: stringOrNull(payload.deadlineKey),
      amountSatang: typeof payload.amountSatang === "number" ? payload.amountSatang : null,
    });
    let invoiceNote = "No invoice was created.";
    if (typeof payload.amountSatang === "number" && payload.amountSatang > 0) {
      const invoice = await createDraftInvoice({
        caseId: created.id,
        userId: String(payload.userId),
        amountSatang: payload.amountSatang,
        lines: payload.lines,
        reason: "Work plan",
      });
      invoiceNote = `Draft invoice ${invoice.invoiceNumber} for ${formatSatang(invoice.amount)} was saved and not sent.`;
    }
    const customer = await prisma.user.findUnique({ where: { id: String(payload.userId) }, select: { name: true } });
    const service = await prisma.service.findUnique({ where: { id: String(payload.serviceId) }, select: { name: true } });
    const message = fillTemplate(recommendTemplate("booking confirmation").body, {
      name: customer?.name,
      service: service?.name,
      caseNumber: created.caseNumber,
      amount: typeof payload.amountSatang === "number" ? formatSatang(payload.amountSatang) : "",
    });
    return {
      summary: `Created ${created.caseNumber}. ${invoiceNote}\n\nDraft message, not sent:\n${message}`,
      href: `/admin/cases/${created.id}`,
      entityType: "case",
      entityId: created.id,
    };
  }
  throw new BackofficeError("That action is not available.", 400);
}

async function reviseInvoice(payload: Record<string, unknown>, actorId: string | null) {
  const invoice = await prisma.invoice.findUnique({ where: { id: String(payload.invoiceId) } });
  if (!invoice) throw new BackofficeError("That invoice no longer exists.", 404);
  if (invoice.amount !== Number(payload.previousAmount)) {
    throw new BackofficeError("The invoice changed after this request. Ask again so the figures are current. Nothing was saved.", 409);
  }
  const proposed = Number(payload.proposedAmount);
  if (!Number.isInteger(proposed) || proposed <= 0) throw new BackofficeError("The proposed amount is not valid.", 400);
  const mode = invoiceChangeMode(invoice.status);
  if (mode === "update_draft") {
    const updated = await prisma.invoice.update({ where: { id: invoice.id }, data: { amount: proposed } });
    await prisma.invoiceRevision.create({
      data: { invoiceId: invoice.id, previousAmount: invoice.amount, proposedAmount: proposed, reason: String(payload.reason ?? ""), applied: true, staffId: actorId },
    });
    return { summary: `Updated draft ${updated.invoiceNumber ?? updated.id} to ${formatSatang(proposed)}. The revision is recorded.`, entityType: "invoice", entityId: invoice.id };
  }
  const replacement = await createDraftInvoice({
    caseId: invoice.caseId,
    userId: invoice.userId,
    amountSatang: proposed,
    lines: [{ code: "revision", name: `Revision of ${invoice.invoiceNumber ?? invoice.id}`, amountSatang: proposed }],
    reason: String(payload.reason ?? ""),
  });
  await prisma.invoiceRevision.create({
    data: {
      invoiceId: invoice.id,
      previousAmount: invoice.amount,
      proposedAmount: proposed,
      reason: String(payload.reason ?? ""),
      applied: false,
      replacementInvoiceId: replacement.id,
      staffId: actorId,
    },
  });
  return {
    summary: `Left issued invoice ${invoice.invoiceNumber ?? invoice.id} unchanged. Saved draft ${replacement.invoiceNumber} for ${formatSatang(proposed)} and recorded the revision.`,
    href: `/admin/invoices/${replacement.id}`,
    entityType: "invoice",
    entityId: replacement.id,
  };
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

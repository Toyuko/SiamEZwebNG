import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createFollowUp } from "@/lib/follow-ups/service";
import { addCalendarDays, todayInBangkok } from "@/lib/follow-ups/dates";
import { dateKeyFromParts } from "@/lib/backoffice/format";
import { missingRequiredDocuments, requiredDocumentNames } from "@/lib/backoffice/documents";
import {
  DEFAULT_AUTOMATION_RULES,
  DEFAULT_WORKFLOW_TEMPLATES,
  asStringList,
  bookingWorkflowKey,
  draftBookingMessage,
  planBookingWorkflow,
  type WorkflowTemplateSeed,
} from "@/lib/backoffice/workflow-plan";

function isUnique(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function ensureAutomationCatalogue(): Promise<void> {
  for (const template of DEFAULT_WORKFLOW_TEMPLATES) {
    await prisma.backofficeWorkflowTemplate.upsert({
      where: { serviceKey: template.serviceKey },
      create: {
        serviceKey: template.serviceKey,
        name: template.name,
        matchTokens: template.match,
        documents: template.documents,
        stages: template.stages,
        taskTitle: template.taskTitle,
      },
      update: {},
    });
  }
  for (const rule of DEFAULT_AUTOMATION_RULES) {
    await prisma.backofficeAutomationRule.upsert({
      where: { key: rule.key },
      create: rule,
      update: { name: rule.name, description: rule.description },
    });
  }
}

async function loadTemplates(): Promise<WorkflowTemplateSeed[]> {
  const rows = await prisma.backofficeWorkflowTemplate.findMany({ where: { active: true } });
  if (rows.length === 0) return DEFAULT_WORKFLOW_TEMPLATES;
  return rows.map((row) => ({
    serviceKey: row.serviceKey,
    name: row.name,
    match: row.matchTokens,
    documents: asStringList(row.documents),
    stages: asStringList(row.stages),
    taskTitle: row.taskTitle,
  }));
}

export async function runBookingWorkflow(caseId: string): Promise<{ status: string; summary: string }> {
  try {
    return await executeBookingWorkflow(caseId);
  } catch (error) {
    console.error("[backoffice] booking workflow", error);
    return { status: "failed", summary: "The booking workflow failed before it could finish." };
  }
}

async function executeBookingWorkflow(caseId: string): Promise<{ status: string; summary: string }> {
  await ensureAutomationCatalogue();
  const rule = await prisma.backofficeAutomationRule.findUnique({ where: { key: "booking_created" } });
  if (!rule?.enabled) return { status: "skipped", summary: "The new-booking workflow is turned off." };

  const existing = await prisma.backofficeAutomationRun.findUnique({ where: { idempotencyKey: bookingWorkflowKey(caseId) } });
  if (existing) return { status: existing.status, summary: existing.summary };

  const booking = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      caseNumber: true,
      userId: true,
      guestName: true,
      documentsRequired: true,
      salesPersonId: true,
      service: { select: { name: true } },
      otherServiceName: true,
      documents: { select: { name: true, documentType: true } },
      user: { select: { id: true, name: true, role: true } },
      staffAssignments: { select: { userId: true }, take: 1 },
    },
  });
  if (!booking) return { status: "skipped", summary: "The booking was not found." };

  const serviceName = booking.service?.name ?? booking.otherServiceName ?? "the selected service";
  const stored = requiredDocumentNames(booking.documentsRequired);
  const plan = planBookingWorkflow({
    serviceName,
    templates: await loadTemplates(),
    uploaded: booking.documents,
    customerName: booking.user?.name || booking.guestName || "there",
    storedChecklist: stored,
  });

  let runId: string | null = null;
  try {
    const run = await prisma.backofficeAutomationRun.create({
      data: {
        ruleId: rule.id,
        idempotencyKey: bookingWorkflowKey(caseId),
        status: "pending_approval",
        trigger: "booking_created",
        caseId: booking.id,
        customerId: booking.userId,
        summary: "Preparing the booking workflow.",
        actorLabel: "automation",
      },
    });
    runId = run.id;
    if (stored.length === 0) {
      await prisma.case.update({ where: { id: booking.id }, data: { documentsRequired: plan.checklist } });
    }
    const missing = stored.length > 0 ? missingRequiredDocuments(stored, booking.documents) : plan.missing;
    const message = draftBookingMessage({
      customerName: booking.user?.name || booking.guestName || "there",
      serviceName,
      missing,
    });
    let taskId: string | null = null;
    let taskNote = "No customer account is linked, so no internal task was created.";
    if (missing.length === 0) taskNote = "The checklist items already match uploaded documents, so no document task was created.";
    else if (booking.user?.role === "customer") {
      const followUp = await createFollowUp({
        clientId: booking.user.id,
        caseId: booking.id,
        title: plan.taskTitle,
        dueDate: dateKeyFromParts(addCalendarDays(todayInBangkok(), 1)),
        assignedStaffId: booking.staffAssignments[0]?.userId ?? booking.salesPersonId,
        followUpType: "DOCUMENT_REQUEST",
        emailReminderEnabled: false,
        description: `Booking workflow. Missing: ${missing.join(", ")}. The customer message was drafted and not sent.`,
      });
      taskId = followUp.id;
      taskNote = "Internal task created for staff. Customer email was not sent.";
    }
    const summary = [
      `${booking.caseNumber}: ${plan.templateName}.`,
      `Stage: ${plan.stage}.`,
      `Checklist: ${plan.checklist.join(", ")}.`,
      missing.length ? `Missing: ${missing.join(", ")}.` : "No checklist item is missing.",
      taskNote,
      "Customer message drafted for approval.",
    ].join(" ");
    await prisma.backofficeAutomationRun.update({
      where: { id: run.id },
      data: {
        status: "pending_approval",
        summary,
        result: { checklist: plan.checklist, missing, taskId, message, stage: plan.stage, serviceKey: plan.serviceKey },
        executedAt: new Date(),
      },
    });
    return { status: "pending_approval", summary };
  } catch (error) {
    if (isUnique(error)) {
      const raced = await prisma.backofficeAutomationRun.findUnique({ where: { idempotencyKey: bookingWorkflowKey(caseId) } });
      return { status: raced?.status ?? "skipped", summary: raced?.summary ?? "This booking was already processed." };
    }
    const message = error instanceof Error ? error.message : "Workflow failed";
    if (runId) {
      await prisma.backofficeAutomationRun.update({
        where: { id: runId },
        data: { status: "failed", summary: "The booking workflow failed.", error: message.slice(0, 500), executedAt: new Date() },
      });
    }
    return { status: "failed", summary: "The booking workflow failed." };
  }
}

export async function sweepRecentBookings(limit = 20): Promise<number> {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const cases = await prisma.case.findMany({
    where: { createdAt: { gte: since } },
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  const done = await prisma.backofficeAutomationRun.findMany({
    where: { idempotencyKey: { in: cases.map((row) => bookingWorkflowKey(row.id)) } },
    select: { idempotencyKey: true },
  });
  const seen = new Set(done.map((row) => row.idempotencyKey));
  const pending = cases.filter((row) => !seen.has(bookingWorkflowKey(row.id))).slice(0, limit);
  for (const row of pending) await runBookingWorkflow(row.id);
  return pending.length;
}

export async function automationDashboard(): Promise<{
  rules: { id: string; key: string; name: string; description: string; trigger: string; enabled: boolean }[];
  runs: { id: string; status: string; trigger: string; summary: string; error: string | null; actorLabel: string; executedAt: string }[];
  counts: { activeRules: number; pendingApproval: number; failed: number; completed: number };
}> {
  await ensureAutomationCatalogue();
  const [rules, runs, pendingApproval, failed, completed] = await Promise.all([
    prisma.backofficeAutomationRule.findMany({ orderBy: { name: "asc" } }),
    prisma.backofficeAutomationRun.findMany({ orderBy: { executedAt: "desc" }, take: 30 }),
    prisma.backofficeAutomationRun.count({ where: { status: "pending_approval" } }),
    prisma.backofficeAutomationRun.count({ where: { status: "failed" } }),
    prisma.backofficeAutomationRun.count({ where: { status: "completed" } }),
  ]);
  return {
    rules: rules.map((rule) => ({ id: rule.id, key: rule.key, name: rule.name, description: rule.description, trigger: rule.trigger, enabled: rule.enabled })),
    runs: runs.map((run) => ({
      id: run.id,
      status: run.status,
      trigger: run.trigger,
      summary: run.summary,
      error: run.error,
      actorLabel: run.actorLabel,
      executedAt: run.executedAt.toISOString(),
    })),
    counts: { activeRules: rules.filter((rule) => rule.enabled).length, pendingApproval, failed, completed },
  };
}

export async function setAutomationEnabled(key: string, enabled: boolean, editorId: string | null): Promise<void> {
  await prisma.backofficeAutomationRule.update({ where: { key }, data: { enabled, updatedById: editorId } });
}

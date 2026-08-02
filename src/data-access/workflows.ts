import { prisma } from "@/lib/db";
import type {
  Prisma,
  WorkflowRunStatus,
  WorkflowStepKind,
  WorkflowStepRunStatus,
} from "@prisma/client";
import {
  computeNextSteps,
  decideAdvanceStep,
  decideRunTransition,
  decideStaffApprove,
  decideStaffReject,
  parseStepTarget,
  resolveStepTargetHref,
  runTimestampPatch,
  serializeStepTarget,
  stepTimestampPatch,
  suggestRunStatusAfterSteps,
  summarizeStepStatuses,
  type WorkflowStepTarget,
} from "@/lib/workflows";

const templateStepOrder = { orderBy: { sortOrder: "asc" as const } };

const templateInclude = {
  steps: templateStepOrder,
} satisfies Prisma.WorkflowTemplateInclude;

const runInclude = {
  template: { include: templateInclude },
  linkedCase: { select: { id: true, caseNumber: true, status: true } },
  steps: {
    include: {
      templateStep: true,
      approvedBy: { select: { id: true, name: true, email: true } },
    },
  },
} satisfies Prisma.WorkflowRunInclude;

// ----- Admin template CRUD -----

export async function listTemplatesAdmin() {
  return prisma.workflowTemplate.findMany({
    include: {
      steps: { orderBy: { sortOrder: "asc" }, select: { id: true } },
      _count: { select: { runs: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { titleEn: "asc" }],
  });
}

export async function listActiveTemplates() {
  return prisma.workflowTemplate.findMany({
    where: { active: true },
    include: templateInclude,
    orderBy: [{ sortOrder: "asc" }, { titleEn: "asc" }],
  });
}

export async function getTemplateById(id: string) {
  return prisma.workflowTemplate.findUnique({
    where: { id },
    include: templateInclude,
  });
}

export async function getTemplateByKey(key: string) {
  return prisma.workflowTemplate.findUnique({
    where: { key },
    include: templateInclude,
  });
}

export type TemplateWriteInput = {
  key: string;
  titleEn: string;
  titleTh?: string | null;
  descriptionEn?: string | null;
  descriptionTh?: string | null;
  active?: boolean;
  sortOrder?: number;
};

export async function createTemplate(data: TemplateWriteInput) {
  const key = data.key.trim().toLowerCase().replace(/\s+/g, "-");
  return prisma.workflowTemplate.create({
    data: {
      key,
      titleEn: data.titleEn.trim(),
      titleTh: data.titleTh?.trim() || null,
      descriptionEn: data.descriptionEn?.trim() || null,
      descriptionTh: data.descriptionTh?.trim() || null,
      active: data.active ?? true,
      sortOrder: data.sortOrder ?? 0,
    },
  });
}

export async function updateTemplate(id: string, data: Partial<TemplateWriteInput>) {
  const patch: Prisma.WorkflowTemplateUpdateInput = {};
  if (data.key !== undefined) {
    patch.key = data.key.trim().toLowerCase().replace(/\s+/g, "-");
  }
  if (data.titleEn !== undefined) patch.titleEn = data.titleEn.trim();
  if (data.titleTh !== undefined) patch.titleTh = data.titleTh?.trim() || null;
  if (data.descriptionEn !== undefined) {
    patch.descriptionEn = data.descriptionEn?.trim() || null;
  }
  if (data.descriptionTh !== undefined) {
    patch.descriptionTh = data.descriptionTh?.trim() || null;
  }
  if (data.active !== undefined) patch.active = data.active;
  if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
  return prisma.workflowTemplate.update({ where: { id }, data: patch });
}

export async function deleteTemplate(id: string) {
  return prisma.workflowTemplate.delete({ where: { id } });
}

export type TemplateStepWriteInput = {
  key?: string | null;
  titleEn: string;
  titleTh?: string | null;
  descriptionEn?: string | null;
  descriptionTh?: string | null;
  sortOrder?: number;
  kind?: WorkflowStepKind;
  requiresApproval?: boolean;
  target?: WorkflowStepTarget;
};

export async function createTemplateStep(templateId: string, data: TemplateStepWriteInput) {
  return prisma.workflowTemplateStep.create({
    data: {
      templateId,
      key: data.key?.trim() || null,
      titleEn: data.titleEn.trim(),
      titleTh: data.titleTh?.trim() || null,
      descriptionEn: data.descriptionEn?.trim() || null,
      descriptionTh: data.descriptionTh?.trim() || null,
      sortOrder: data.sortOrder ?? 0,
      kind: data.kind ?? "action",
      requiresApproval: data.requiresApproval ?? false,
      target: serializeStepTarget(data.target ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function updateTemplateStep(id: string, data: Partial<TemplateStepWriteInput>) {
  const patch: Prisma.WorkflowTemplateStepUpdateInput = {};
  if (data.key !== undefined) patch.key = data.key?.trim() || null;
  if (data.titleEn !== undefined) patch.titleEn = data.titleEn.trim();
  if (data.titleTh !== undefined) patch.titleTh = data.titleTh?.trim() || null;
  if (data.descriptionEn !== undefined) {
    patch.descriptionEn = data.descriptionEn?.trim() || null;
  }
  if (data.descriptionTh !== undefined) {
    patch.descriptionTh = data.descriptionTh?.trim() || null;
  }
  if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
  if (data.kind !== undefined) patch.kind = data.kind;
  if (data.requiresApproval !== undefined) patch.requiresApproval = data.requiresApproval;
  if (data.target !== undefined) {
    patch.target = serializeStepTarget(data.target) as Prisma.InputJsonValue;
  }
  return prisma.workflowTemplateStep.update({ where: { id }, data: patch });
}

export async function deleteTemplateStep(id: string) {
  return prisma.workflowTemplateStep.delete({ where: { id } });
}

// ----- Runs -----

export async function getRunById(id: string) {
  return prisma.workflowRun.findUnique({
    where: { id },
    include: runInclude,
  });
}

export async function listUserRuns(userId: string) {
  return prisma.workflowRun.findMany({
    where: { userId },
    include: runInclude,
    orderBy: { startedAt: "desc" },
  });
}

export async function listPendingApprovals() {
  return prisma.workflowStepRun.findMany({
    where: { status: "awaiting_approval" },
    include: {
      templateStep: true,
      run: {
        include: {
          template: true,
          user: { select: { id: true, name: true, email: true } },
          linkedCase: { select: { id: true, caseNumber: true } },
        },
      },
      approvedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: "asc" },
  });
}

/**
 * Start a workflow run for a user: create run + step runs in pending state.
 * First step is left pending (customer advances).
 */
export async function startWorkflowRun(userId: string, templateId: string) {
  const template = await prisma.workflowTemplate.findFirst({
    where: { id: templateId, active: true },
    include: templateInclude,
  });
  if (!template) throw new Error("Workflow template not found or inactive");
  if (template.steps.length === 0) throw new Error("Workflow template has no steps");

  return prisma.workflowRun.create({
    data: {
      userId,
      templateId: template.id,
      status: "active",
      steps: {
        create: template.steps.map((step) => ({
          templateStepId: step.id,
          status: "pending" as WorkflowStepRunStatus,
        })),
      },
    },
    include: runInclude,
  });
}

async function syncRunStatus(runId: string) {
  const run = await prisma.workflowRun.findUnique({
    where: { id: runId },
    include: { steps: true },
  });
  if (!run) return null;
  const summary = summarizeStepStatuses(run.steps.map((s) => s.status));
  const suggested = suggestRunStatusAfterSteps(run.status, summary);
  if (suggested === run.status) return run;
  const decided = decideRunTransition(run.status, suggested);
  if (!decided.ok) return run;
  return prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status: suggested,
      ...runTimestampPatch(suggested),
    },
    include: runInclude,
  });
}

export async function advanceStepRun(stepRunId: string, userId: string) {
  const stepRun = await prisma.workflowStepRun.findUnique({
    where: { id: stepRunId },
    include: {
      templateStep: true,
      run: true,
    },
  });
  if (!stepRun || stepRun.run.userId !== userId) {
    throw new Error("Step run not found");
  }

  const decision = decideAdvanceStep({
    current: stepRun.status,
    requiresApproval: stepRun.templateStep.requiresApproval,
    runStatus: stepRun.run.status,
  });
  if (!decision.ok) {
    throw new Error(decision.reason);
  }

  const now = new Date();
  await prisma.workflowStepRun.update({
    where: { id: stepRunId },
    data: {
      status: decision.to,
      ...stepTimestampPatch(decision.to, now),
    },
  });

  return syncRunStatus(stepRun.runId);
}

export async function staffApproveStep(
  stepRunId: string,
  staffUserId: string
) {
  const stepRun = await prisma.workflowStepRun.findUnique({
    where: { id: stepRunId },
    include: { templateStep: true, run: true },
  });
  if (!stepRun) throw new Error("Step run not found");

  const decision = decideStaffApprove({
    current: stepRun.status,
    runStatus: stepRun.run.status,
  });
  if (!decision.ok) throw new Error(decision.reason);

  const now = new Date();
  await prisma.workflowStepRun.update({
    where: { id: stepRunId },
    data: {
      status: "approved",
      approvedById: staffUserId,
      ...stepTimestampPatch("approved", now),
    },
  });

  // Auto-complete approved steps so the run can advance
  await prisma.workflowStepRun.update({
    where: { id: stepRunId },
    data: {
      status: "completed",
      ...stepTimestampPatch("completed", now),
    },
  });

  return syncRunStatus(stepRun.runId);
}

export async function staffRejectStep(
  stepRunId: string,
  staffUserId: string,
  reason?: string
) {
  const stepRun = await prisma.workflowStepRun.findUnique({
    where: { id: stepRunId },
    include: { run: true },
  });
  if (!stepRun) throw new Error("Step run not found");

  const decision = decideStaffReject({
    current: stepRun.status,
    runStatus: stepRun.run.status,
  });
  if (!decision.ok) throw new Error(decision.reason);

  const now = new Date();
  await prisma.workflowStepRun.update({
    where: { id: stepRunId },
    data: {
      status: "rejected",
      approvedById: staffUserId,
      rejectionReason: reason?.trim() || null,
      ...stepTimestampPatch("rejected", now),
    },
  });

  return syncRunStatus(stepRun.runId);
}

/**
 * Link a Case created via existing booking APIs onto the run.
 * Does not call or modify submitBooking / createBookingCase contracts.
 */
export async function linkCaseToRun(
  runId: string,
  userId: string,
  caseId: string
) {
  const run = await prisma.workflowRun.findFirst({
    where: { id: runId, userId },
  });
  if (!run) throw new Error("Workflow run not found");

  const c = await prisma.case.findFirst({
    where: { id: caseId, userId },
    select: { id: true },
  });
  if (!c) throw new Error("Case not found for this user");

  return prisma.workflowRun.update({
    where: { id: runId },
    data: { linkedCaseId: caseId },
    include: runInclude,
  });
}

export async function cancelRun(runId: string, userId: string) {
  const run = await prisma.workflowRun.findFirst({
    where: { id: runId, userId },
  });
  if (!run) throw new Error("Workflow run not found");
  const decided = decideRunTransition(run.status, "cancelled");
  if (!decided.ok) throw new Error(decided.reason);
  return prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status: "cancelled",
      ...runTimestampPatch("cancelled"),
    },
    include: runInclude,
  });
}

export function buildTimelineView(
  run: NonNullable<Awaited<ReturnType<typeof getRunById>>>,
  locale: "en" | "th" = "en"
) {
  const ordered = [...run.steps].sort(
    (a, b) => a.templateStep.sortOrder - b.templateStep.sortOrder
  );
  const summary = summarizeStepStatuses(ordered.map((s) => s.status));
  const nextSteps = computeNextSteps(
    ordered.map((s) => ({
      stepRunId: s.id,
      templateStepId: s.templateStepId,
      titleEn: s.templateStep.titleEn,
      titleTh: s.templateStep.titleTh,
      status: s.status,
      kind: s.templateStep.kind,
      requiresApproval: s.templateStep.requiresApproval,
      target: s.templateStep.target,
      sortOrder: s.templateStep.sortOrder,
    })),
    { runStatus: run.status, preferBook: true }
  );

  const title =
    locale === "th" && run.template.titleTh
      ? run.template.titleTh
      : run.template.titleEn;

  return {
    runId: run.id,
    templateKey: run.template.key,
    title,
    status: run.status as WorkflowRunStatus,
    linkedCaseId: run.linkedCaseId,
    linkedCaseNumber: run.linkedCase?.caseNumber ?? null,
    summary,
    nextSteps,
    steps: ordered.map((s) => {
      const target = parseStepTarget(s.templateStep.target);
      const stepTitle =
        locale === "th" && s.templateStep.titleTh
          ? s.templateStep.titleTh
          : s.templateStep.titleEn;
      const description =
        locale === "th" && s.templateStep.descriptionTh
          ? s.templateStep.descriptionTh
          : s.templateStep.descriptionEn;
      return {
        stepRunId: s.id,
        templateStepId: s.templateStepId,
        title: stepTitle,
        description: description ?? null,
        status: s.status,
        kind: s.templateStep.kind,
        requiresApproval: s.templateStep.requiresApproval,
        href: resolveStepTargetHref(target, {
          preferBook: s.templateStep.kind === "booking",
        }),
        approvedAt: s.approvedAt,
        rejectedAt: s.rejectedAt,
        rejectionReason: s.rejectionReason,
        completedAt: s.completedAt,
      };
    }),
  };
}

import { prisma } from "@/lib/db";
import type { LifeEventRunStatus, LifeEventStepStatus, Prisma } from "@prisma/client";
import {
  decideRunTransition,
  decideStepTransition,
  parseStepTarget,
  resolveStepTargetHref,
  runTimestampPatch,
  serializeStepTarget,
  stepTimestampPatch,
  suggestRunStatusAfterSteps,
  summarizeStepStatuses,
  type LifeEventStepTarget,
} from "@/lib/life-events";

const stepInclude = {
  steps: { orderBy: { sortOrder: "asc" as const } },
} satisfies Prisma.LifeEventInclude;

export async function listLifeEventsAdmin() {
  return prisma.lifeEvent.findMany({
    include: {
      steps: { orderBy: { sortOrder: "asc" }, select: { id: true } },
      _count: { select: { progress: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { titleEn: "asc" }],
  });
}

export async function listActiveLifeEvents() {
  return prisma.lifeEvent.findMany({
    where: { active: true },
    include: stepInclude,
    orderBy: [{ sortOrder: "asc" }, { titleEn: "asc" }],
  });
}

export async function getLifeEventById(id: string) {
  return prisma.lifeEvent.findUnique({
    where: { id },
    include: stepInclude,
  });
}

export async function getLifeEventByKey(key: string) {
  return prisma.lifeEvent.findUnique({
    where: { key },
    include: stepInclude,
  });
}

export type LifeEventWriteInput = {
  key: string;
  titleEn: string;
  titleTh?: string | null;
  descriptionEn?: string | null;
  descriptionTh?: string | null;
  active?: boolean;
  sortOrder?: number;
};

export async function createLifeEvent(data: LifeEventWriteInput) {
  const key = data.key.trim().toLowerCase().replace(/\s+/g, "-");
  return prisma.lifeEvent.create({
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

export async function updateLifeEvent(id: string, data: Partial<LifeEventWriteInput>) {
  const patch: Prisma.LifeEventUpdateInput = {};
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
  return prisma.lifeEvent.update({ where: { id }, data: patch });
}

export async function deleteLifeEvent(id: string) {
  return prisma.lifeEvent.delete({ where: { id } });
}

export type StepWriteInput = {
  titleEn: string;
  titleTh?: string | null;
  descriptionEn?: string | null;
  descriptionTh?: string | null;
  sortOrder?: number;
  target?: LifeEventStepTarget;
};

export async function createLifeEventStep(lifeEventId: string, data: StepWriteInput) {
  return prisma.lifeEventStep.create({
    data: {
      lifeEventId,
      titleEn: data.titleEn.trim(),
      titleTh: data.titleTh?.trim() || null,
      descriptionEn: data.descriptionEn?.trim() || null,
      descriptionTh: data.descriptionTh?.trim() || null,
      sortOrder: data.sortOrder ?? 0,
      target: serializeStepTarget(data.target ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function updateLifeEventStep(stepId: string, data: Partial<StepWriteInput>) {
  const patch: Prisma.LifeEventStepUpdateInput = {};
  if (data.titleEn !== undefined) patch.titleEn = data.titleEn.trim();
  if (data.titleTh !== undefined) patch.titleTh = data.titleTh?.trim() || null;
  if (data.descriptionEn !== undefined) {
    patch.descriptionEn = data.descriptionEn?.trim() || null;
  }
  if (data.descriptionTh !== undefined) {
    patch.descriptionTh = data.descriptionTh?.trim() || null;
  }
  if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
  if (data.target !== undefined) {
    patch.target = serializeStepTarget(data.target) as Prisma.InputJsonValue;
  }
  return prisma.lifeEventStep.update({ where: { id: stepId }, data: patch });
}

export async function deleteLifeEventStep(stepId: string) {
  return prisma.lifeEventStep.delete({ where: { id: stepId } });
}

export async function startLifeEventForUser(userId: string, lifeEventId: string) {
  const event = await prisma.lifeEvent.findFirst({
    where: { id: lifeEventId, active: true },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });
  if (!event) {
    throw new Error("Life event not found or inactive");
  }

  const existing = await prisma.lifeEventProgress.findUnique({
    where: { userId_lifeEventId: { userId, lifeEventId } },
    include: {
      steps: true,
      lifeEvent: { include: stepInclude },
    },
  });
  if (existing) {
    if (existing.status === "abandoned") {
      return prisma.lifeEventProgress.update({
        where: { id: existing.id },
        data: {
          status: "active",
          completedAt: null,
          startedAt: new Date(),
        },
        include: {
          steps: true,
          lifeEvent: { include: stepInclude },
        },
      });
    }
    return existing;
  }

  return prisma.lifeEventProgress.create({
    data: {
      userId,
      lifeEventId,
      status: "active",
      steps: {
        create: event.steps.map((s) => ({
          stepId: s.id,
          status: "pending" as LifeEventStepStatus,
        })),
      },
    },
    include: {
      steps: true,
      lifeEvent: { include: stepInclude },
    },
  });
}

export async function listUserLifeEventProgress(userId: string) {
  return prisma.lifeEventProgress.findMany({
    where: { userId },
    include: {
      lifeEvent: { include: stepInclude },
      steps: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getUserLifeEventProgress(userId: string, progressId: string) {
  return prisma.lifeEventProgress.findFirst({
    where: { id: progressId, userId },
    include: {
      lifeEvent: { include: stepInclude },
      steps: true,
    },
  });
}

export async function transitionStepProgress(
  userId: string,
  progressId: string,
  stepId: string,
  to: LifeEventStepStatus,
  now: Date = new Date()
) {
  const progress = await prisma.lifeEventProgress.findFirst({
    where: { id: progressId, userId },
    include: { steps: true },
  });
  if (!progress) throw new Error("Progress not found");

  const stepRow = progress.steps.find((s) => s.stepId === stepId);
  if (!stepRow) throw new Error("Step progress not found");

  const decision = decideStepTransition(stepRow.status, to);
  if (!decision.ok) {
    throw new Error(`Cannot transition step from ${stepRow.status} to ${to}`);
  }

  const ts = stepTimestampPatch(to, now);
  await prisma.lifeEventStepProgress.update({
    where: { id: stepRow.id },
    data: {
      status: to,
      ...(ts.startedAt !== undefined ? { startedAt: ts.startedAt } : {}),
      ...(ts.completedAt !== undefined ? { completedAt: ts.completedAt } : {}),
    },
  });

  const refreshed = await prisma.lifeEventStepProgress.findMany({
    where: { progressId },
    select: { status: true },
  });
  const summary = summarizeStepStatuses(refreshed.map((r) => r.status));
  const suggested = suggestRunStatusAfterSteps(progress.status, summary);
  if (suggested !== progress.status) {
    const runDecision = decideRunTransition(progress.status, suggested);
    if (runDecision.ok) {
      const runTs = runTimestampPatch(suggested, now);
      await prisma.lifeEventProgress.update({
        where: { id: progressId },
        data: {
          status: suggested,
          ...(runTs.completedAt !== undefined ? { completedAt: runTs.completedAt } : {}),
        },
      });
    }
  }

  return getUserLifeEventProgress(userId, progressId);
}

export async function setRunStatus(
  userId: string,
  progressId: string,
  to: LifeEventRunStatus,
  now: Date = new Date()
) {
  const progress = await prisma.lifeEventProgress.findFirst({
    where: { id: progressId, userId },
  });
  if (!progress) throw new Error("Progress not found");
  const decision = decideRunTransition(progress.status, to);
  if (!decision.ok) {
    throw new Error(`Cannot transition run from ${progress.status} to ${to}`);
  }
  const ts = runTimestampPatch(to, now);
  return prisma.lifeEventProgress.update({
    where: { id: progressId },
    data: {
      status: to,
      ...(ts.completedAt !== undefined ? { completedAt: ts.completedAt } : {}),
    },
    include: {
      lifeEvent: { include: stepInclude },
      steps: true,
    },
  });
}

/** Build checklist view model for portal UI. */
export function buildChecklistView(
  progress: NonNullable<Awaited<ReturnType<typeof getUserLifeEventProgress>>>,
  locale: "en" | "th" = "en"
) {
  const steps = progress.lifeEvent.steps.map((step) => {
    const sp = progress.steps.find((s) => s.stepId === step.id);
    const target = parseStepTarget(step.target);
    const href = resolveStepTargetHref(target, { preferBook: Boolean(target.serviceSlug) });
    const title = locale === "th" && step.titleTh ? step.titleTh : step.titleEn;
    const description =
      locale === "th" && step.descriptionTh
        ? step.descriptionTh
        : step.descriptionEn;
    return {
      stepId: step.id,
      title,
      description,
      sortOrder: step.sortOrder,
      status: (sp?.status ?? "pending") as LifeEventStepStatus,
      startedAt: sp?.startedAt ?? null,
      completedAt: sp?.completedAt ?? null,
      href,
      target,
    };
  });
  const summary = summarizeStepStatuses(steps.map((s) => s.status));
  const eventTitle =
    locale === "th" && progress.lifeEvent.titleTh
      ? progress.lifeEvent.titleTh
      : progress.lifeEvent.titleEn;
  return {
    progressId: progress.id,
    lifeEventId: progress.lifeEventId,
    eventKey: progress.lifeEvent.key,
    eventTitle,
    runStatus: progress.status,
    startedAt: progress.startedAt,
    completedAt: progress.completedAt,
    summary,
    steps,
  };
}

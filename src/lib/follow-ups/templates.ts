import { prisma } from "@/lib/db";
import {
  applyRelativeDate,
  formatDateOnly,
  parseDateOnly,
  todayInBangkok,
  toUtcDateOnly,
} from "@/lib/follow-ups/dates";
import { createFollowUp } from "@/lib/follow-ups/service";
import type {
  FollowUpPriority,
  FollowUpTemplateTrigger,
  FollowUpType,
  Prisma,
  RelativeDateDirection,
  RelativeDateUnit,
} from "@prisma/client";

export type CreateTemplateInput = {
  name: string;
  description?: string | null;
  serviceId?: string | null;
  serviceSlug?: string | null;
  followUpType?: FollowUpType;
  priority?: FollowUpPriority;
  delayValue?: number;
  delayUnit?: RelativeDateUnit;
  delayDirection?: RelativeDateDirection;
  triggerEvent?: FollowUpTemplateTrigger;
  reminderEnabled?: boolean;
  reminderOffsetValue?: number;
  reminderOffsetUnit?: RelativeDateUnit;
  reminderOffsetDirection?: RelativeDateDirection;
  emailEnabled?: boolean;
  emailSubject?: string | null;
  emailBody?: string | null;
  defaultAssigneeId?: string | null;
  autoApply?: boolean;
  active?: boolean;
  createdById?: string | null;
};

export type UpdateTemplateInput = Partial<CreateTemplateInput>;

export async function createFollowUpTemplate(input: CreateTemplateInput) {
  return prisma.followUpTemplate.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      serviceId: input.serviceId ?? null,
      serviceSlug: input.serviceSlug?.trim() || null,
      followUpType: input.followUpType ?? "CUSTOM",
      priority: input.priority ?? "NORMAL",
      delayValue: input.delayValue ?? 7,
      delayUnit: input.delayUnit ?? "DAYS",
      delayDirection: input.delayDirection ?? "AFTER",
      triggerEvent: input.triggerEvent ?? "MANUAL",
      reminderEnabled: input.reminderEnabled ?? true,
      reminderOffsetValue: input.reminderOffsetValue ?? 0,
      reminderOffsetUnit: input.reminderOffsetUnit ?? "DAYS",
      reminderOffsetDirection: input.reminderOffsetDirection ?? "BEFORE",
      emailEnabled: input.emailEnabled ?? true,
      emailSubject: input.emailSubject?.trim() || null,
      emailBody: input.emailBody?.trim() || null,
      defaultAssigneeId: input.defaultAssigneeId ?? null,
      autoApply: input.autoApply ?? false,
      active: input.active ?? true,
      createdById: input.createdById ?? null,
    },
  });
}

export async function updateFollowUpTemplate(id: string, input: UpdateTemplateInput) {
  const existing = await prisma.followUpTemplate.findUnique({ where: { id } });
  if (!existing) throw new Error("Template not found");

  return prisma.followUpTemplate.update({
    where: { id },
    data: {
      name: input.name?.trim() ?? existing.name,
      description:
        input.description !== undefined
          ? input.description?.trim() || null
          : existing.description,
      serviceId: input.serviceId !== undefined ? input.serviceId : existing.serviceId,
      serviceSlug:
        input.serviceSlug !== undefined
          ? input.serviceSlug?.trim() || null
          : existing.serviceSlug,
      followUpType: input.followUpType ?? existing.followUpType,
      priority: input.priority ?? existing.priority,
      delayValue: input.delayValue ?? existing.delayValue,
      delayUnit: input.delayUnit ?? existing.delayUnit,
      delayDirection: input.delayDirection ?? existing.delayDirection,
      triggerEvent: input.triggerEvent ?? existing.triggerEvent,
      reminderEnabled: input.reminderEnabled ?? existing.reminderEnabled,
      reminderOffsetValue: input.reminderOffsetValue ?? existing.reminderOffsetValue,
      reminderOffsetUnit: input.reminderOffsetUnit ?? existing.reminderOffsetUnit,
      reminderOffsetDirection:
        input.reminderOffsetDirection ?? existing.reminderOffsetDirection,
      emailEnabled: input.emailEnabled ?? existing.emailEnabled,
      emailSubject:
        input.emailSubject !== undefined
          ? input.emailSubject?.trim() || null
          : existing.emailSubject,
      emailBody:
        input.emailBody !== undefined
          ? input.emailBody?.trim() || null
          : existing.emailBody,
      defaultAssigneeId:
        input.defaultAssigneeId !== undefined
          ? input.defaultAssigneeId
          : existing.defaultAssigneeId,
      autoApply: input.autoApply ?? existing.autoApply,
      active: input.active ?? existing.active,
    },
  });
}

export async function deleteFollowUpTemplate(id: string) {
  return prisma.followUpTemplate.delete({ where: { id } });
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\[([^\]]+)\]/g, (_, key: string) => vars[key] ?? `[${key}]`);
}

/**
 * Create a FollowUp from a template relative to an anchor date.
 */
export async function applyFollowUpTemplate(input: {
  templateId: string;
  clientId: string;
  caseId?: string | null;
  serviceId?: string | null;
  /** Anchor event date (completion, quote, expiry, contact). Defaults to today Bangkok. */
  anchorDate?: string | Date;
  assignedStaffId?: string | null;
  createdById?: string | null;
  titleOverride?: string | null;
  descriptionOverride?: string | null;
  metadata?: Prisma.InputJsonValue;
  vars?: Record<string, string>;
}) {
  const template = await prisma.followUpTemplate.findUnique({
    where: { id: input.templateId },
  });
  if (!template || !template.active) throw new Error("Template not found or inactive");

  const anchor = input.anchorDate
    ? parseDateOnly(input.anchorDate)
    : todayInBangkok();

  const dueParts = applyRelativeDate({
    anchor,
    value: template.delayValue,
    unit: template.delayUnit,
    direction: template.delayDirection,
  });
  const dueDate = formatDateOnly(dueParts);

  let emailReminderDate: string | null = null;
  if (template.reminderEnabled && template.emailEnabled) {
    const remParts = applyRelativeDate({
      anchor: dueParts,
      value: template.reminderOffsetValue,
      unit: template.reminderOffsetUnit,
      direction: template.reminderOffsetDirection,
    });
    emailReminderDate = formatDateOnly(remParts);
  }

  const vars = {
    "Customer Name": "Customer",
    "Service Name": "your service",
    "Follow-Up Title": template.name,
    ...(input.vars ?? {}),
  };

  const title = input.titleOverride?.trim() || template.name;
  const description =
    input.descriptionOverride !== undefined
      ? input.descriptionOverride
      : template.description;

  return createFollowUp({
    clientId: input.clientId,
    caseId: input.caseId,
    serviceId: input.serviceId ?? template.serviceId,
    title,
    description,
    followUpType: template.followUpType,
    dueDate,
    priority: template.priority,
    assignedStaffId: input.assignedStaffId ?? template.defaultAssigneeId,
    emailReminderEnabled: template.emailEnabled && template.reminderEnabled,
    emailReminderDate,
    emailSubject: template.emailSubject
      ? interpolate(template.emailSubject, vars)
      : null,
    emailBody: template.emailBody ? interpolate(template.emailBody, vars) : null,
    createdById: input.createdById,
    templateId: template.id,
    metadata: input.metadata,
  });
}

/**
 * Auto-apply all matching active templates for a trigger (e.g. case completed).
 */
export async function autoApplyTemplatesForTrigger(input: {
  trigger: FollowUpTemplateTrigger;
  clientId: string;
  caseId?: string | null;
  serviceId?: string | null;
  serviceSlug?: string | null;
  anchorDate?: string | Date;
  assignedStaffId?: string | null;
  createdById?: string | null;
  vars?: Record<string, string>;
}) {
  const templates = await prisma.followUpTemplate.findMany({
    where: {
      active: true,
      autoApply: true,
      triggerEvent: input.trigger,
      OR: [
        { serviceId: null, serviceSlug: null },
        ...(input.serviceId ? [{ serviceId: input.serviceId }] : []),
        ...(input.serviceSlug ? [{ serviceSlug: input.serviceSlug }] : []),
      ],
    },
  });

  const created = [];
  for (const t of templates) {
    // Prefer exact service match; skip global when a more specific match exists handled by query OR
    if (t.serviceId && input.serviceId && t.serviceId !== input.serviceId) continue;
    if (t.serviceSlug && input.serviceSlug && t.serviceSlug !== input.serviceSlug) continue;

    const fu = await applyFollowUpTemplate({
      templateId: t.id,
      clientId: input.clientId,
      caseId: input.caseId,
      serviceId: input.serviceId,
      anchorDate: input.anchorDate,
      assignedStaffId: input.assignedStaffId,
      createdById: input.createdById,
      vars: input.vars,
    });
    created.push(fu);
  }
  return created;
}

/** Compute due + reminder dates for preview without writing. */
export function previewTemplateDates(template: {
  delayValue: number;
  delayUnit: RelativeDateUnit;
  delayDirection: RelativeDateDirection;
  reminderEnabled: boolean;
  reminderOffsetValue: number;
  reminderOffsetUnit: RelativeDateUnit;
  reminderOffsetDirection: RelativeDateDirection;
  emailEnabled: boolean;
}, anchor: string | Date = new Date()) {
  const dueParts = applyRelativeDate({
    anchor: typeof anchor === "string" ? anchor : toUtcDateOnly(todayInBangkok(anchor)),
    value: template.delayValue,
    unit: template.delayUnit,
    direction: template.delayDirection,
  });
  let reminder: string | null = null;
  if (template.reminderEnabled && template.emailEnabled) {
    reminder = formatDateOnly(
      applyRelativeDate({
        anchor: dueParts,
        value: template.reminderOffsetValue,
        unit: template.reminderOffsetUnit,
        direction: template.reminderOffsetDirection,
      })
    );
  }
  return { dueDate: formatDateOnly(dueParts), emailReminderDate: reminder };
}

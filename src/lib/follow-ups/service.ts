import { prisma } from "@/lib/db";
import {
  applyRelativeDate,
  compareDateOnly,
  formatDateOnly,
  parseDateOnly,
  todayInBangkok,
  toUtcDateOnly,
  addCalendarDays,
  type DateParts,
} from "@/lib/follow-ups/dates";
import {
  OPEN_FOLLOW_UP_STATUSES,
  REMINDER_BLOCKED_STATUSES,
} from "@/lib/follow-ups/constants";
import { sendFollowUpReminderEmail } from "@/lib/email/messages";
import { parseNotificationPreferences } from "@/lib/notification-preferences";
import type {
  FollowUpActivityType,
  FollowUpPriority,
  FollowUpReminderSendMethod,
  FollowUpReminderStatus,
  FollowUpStatus,
  FollowUpType,
  Prisma,
  RelativeDateDirection,
  RelativeDateUnit,
} from "@prisma/client";

export type CreateFollowUpInput = {
  clientId: string;
  caseId?: string | null;
  serviceId?: string | null;
  title: string;
  description?: string | null;
  followUpType?: FollowUpType;
  dueDate: string;
  dueTime?: string | null;
  priority?: FollowUpPriority;
  assignedStaffId?: string | null;
  emailReminderEnabled?: boolean;
  emailReminderDate?: string | null;
  emailSubject?: string | null;
  emailBody?: string | null;
  notes?: string | null;
  createdById?: string | null;
  templateId?: string | null;
  metadata?: Prisma.InputJsonValue;
  status?: FollowUpStatus;
};

export type UpdateFollowUpInput = {
  title?: string;
  description?: string | null;
  followUpType?: FollowUpType;
  dueDate?: string;
  dueTime?: string | null;
  priority?: FollowUpPriority;
  assignedStaffId?: string | null;
  emailReminderEnabled?: boolean;
  emailReminderDate?: string | null;
  emailSubject?: string | null;
  emailBody?: string | null;
  notes?: string | null;
  metadata?: Prisma.InputJsonValue;
  actorId?: string | null;
};

const followUpInclude = {
  client: { select: { id: true, name: true, email: true, phone: true } },
  service: { select: { id: true, name: true, slug: true } },
  case: { select: { id: true, caseNumber: true } },
  assignedStaff: { select: { id: true, name: true, email: true } },
  completedBy: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  template: { select: { id: true, name: true } },
  driverLicenseRenewal: {
    select: {
      id: true,
      renewalType: true,
      issueDate: true,
      expiryDate: true,
      nextRenewalDate: true,
      reminderDate: true,
      status: true,
    },
  },
} satisfies Prisma.FollowUpInclude;

export type FollowUpWithRelations = Prisma.FollowUpGetPayload<{
  include: typeof followUpInclude;
}>;

async function logActivity(input: {
  followUpId: string;
  type: FollowUpActivityType;
  fromStatus?: FollowUpStatus | null;
  toStatus?: FollowUpStatus | null;
  sendMethod?: FollowUpReminderSendMethod | null;
  note?: string | null;
  actorId?: string | null;
  meta?: Prisma.InputJsonValue;
}) {
  return prisma.followUpActivity.create({
    data: {
      followUpId: input.followUpId,
      type: input.type,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      sendMethod: input.sendMethod ?? null,
      note: input.note ?? null,
      actorId: input.actorId ?? null,
      meta: input.meta,
    },
  });
}

function deriveStatusFromDue(dueDate: Date, now: Date = new Date()): FollowUpStatus {
  const today = todayInBangkok(now);
  const due = parseDateOnly(dueDate);
  if (compareDateOnly(due, today) <= 0) return "DUE";
  return "PENDING";
}

function customerFollowUpOptedOut(prefs: unknown): boolean {
  const parsed = parseNotificationPreferences(prefs);
  if (parsed.emailFollowUpReminders === false) return true;
  if (parsed.emailRenewalReminders === false) return true;
  return false;
}

export async function createFollowUp(input: CreateFollowUpInput) {
  const client = await prisma.user.findFirst({
    where: { id: input.clientId, role: "customer" },
    select: { id: true },
  });
  if (!client) throw new Error("Client not found");

  if (input.caseId) {
    const linked = await prisma.case.findUnique({
      where: { id: input.caseId },
      select: { id: true, serviceId: true },
    });
    if (!linked) throw new Error("Case not found");
    if (!input.serviceId) input.serviceId = linked.serviceId;
  }

  const dueDate = toUtcDateOnly(parseDateOnly(input.dueDate));
  const emailReminderEnabled = input.emailReminderEnabled ?? true;
  const emailReminderDate = input.emailReminderDate
    ? toUtcDateOnly(parseDateOnly(input.emailReminderDate))
    : emailReminderEnabled
      ? dueDate
      : null;

  const status =
    input.status ??
    deriveStatusFromDue(dueDate);

  const reminderStatus: FollowUpReminderStatus =
    emailReminderEnabled && emailReminderDate ? "SCHEDULED" : "NONE";

  const followUp = await prisma.followUp.create({
    data: {
      clientId: input.clientId,
      caseId: input.caseId ?? null,
      serviceId: input.serviceId ?? null,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      followUpType: input.followUpType ?? "CUSTOM",
      dueDate,
      dueTime: input.dueTime?.trim() || null,
      status,
      priority: input.priority ?? "NORMAL",
      assignedStaffId: input.assignedStaffId ?? null,
      emailReminderEnabled,
      emailReminderDate,
      emailSubject: input.emailSubject?.trim() || null,
      emailBody: input.emailBody?.trim() || null,
      reminderStatus,
      notes: input.notes?.trim() || null,
      createdById: input.createdById ?? null,
      templateId: input.templateId ?? null,
      metadata: input.metadata,
    },
    include: followUpInclude,
  });

  await logActivity({
    followUpId: followUp.id,
    type: input.templateId ? "TEMPLATE_APPLIED" : "CREATED",
    toStatus: status,
    actorId: input.createdById,
    note: input.templateId ? "Follow-up created from template" : "Follow-up created",
  });

  return followUp;
}

export async function updateFollowUp(id: string, input: UpdateFollowUpInput) {
  const existing = await prisma.followUp.findUnique({ where: { id } });
  if (!existing) throw new Error("Follow-up not found");

  const dueDate = input.dueDate
    ? toUtcDateOnly(parseDateOnly(input.dueDate))
    : existing.dueDate;

  let status = existing.status;
  if (
    input.dueDate &&
    (existing.status === "PENDING" || existing.status === "DUE" || existing.status === "SNOOZED")
  ) {
    status = deriveStatusFromDue(dueDate);
  }

  const emailReminderEnabled =
    input.emailReminderEnabled !== undefined
      ? input.emailReminderEnabled
      : existing.emailReminderEnabled;

  let emailReminderDate = existing.emailReminderDate;
  if (input.emailReminderDate !== undefined) {
    emailReminderDate = input.emailReminderDate
      ? toUtcDateOnly(parseDateOnly(input.emailReminderDate))
      : null;
  } else if (input.dueDate && !existing.reminderSentAt) {
    emailReminderDate = emailReminderEnabled ? dueDate : null;
  }

  let reminderStatus = existing.reminderStatus;
  if (!existing.reminderSentAt) {
    reminderStatus =
      emailReminderEnabled && emailReminderDate ? "SCHEDULED" : "NONE";
  }

  const updated = await prisma.followUp.update({
    where: { id },
    data: {
      title: input.title?.trim() ?? existing.title,
      description:
        input.description !== undefined
          ? input.description?.trim() || null
          : existing.description,
      followUpType: input.followUpType ?? existing.followUpType,
      dueDate,
      dueTime:
        input.dueTime !== undefined ? input.dueTime?.trim() || null : existing.dueTime,
      priority: input.priority ?? existing.priority,
      assignedStaffId:
        input.assignedStaffId !== undefined
          ? input.assignedStaffId
          : existing.assignedStaffId,
      emailReminderEnabled,
      emailReminderDate,
      emailSubject:
        input.emailSubject !== undefined
          ? input.emailSubject?.trim() || null
          : existing.emailSubject,
      emailBody:
        input.emailBody !== undefined
          ? input.emailBody?.trim() || null
          : existing.emailBody,
      reminderStatus,
      notes:
        input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
      metadata: input.metadata !== undefined ? input.metadata : undefined,
      status,
    },
    include: followUpInclude,
  });

  const assignedChanged =
    input.assignedStaffId !== undefined &&
    input.assignedStaffId !== existing.assignedStaffId;

  await logActivity({
    followUpId: id,
    type: assignedChanged ? "ASSIGNED" : "UPDATED",
    fromStatus: existing.status,
    toStatus: status,
    actorId: input.actorId,
  });

  return updated;
}

export async function completeFollowUp(input: {
  id: string;
  actorId?: string | null;
  notes?: string | null;
}) {
  const existing = await prisma.followUp.findUnique({ where: { id: input.id } });
  if (!existing) throw new Error("Follow-up not found");

  const updated = await prisma.followUp.update({
    where: { id: input.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      completedById: input.actorId ?? null,
      notes:
        input.notes !== undefined
          ? input.notes?.trim() || null
          : existing.notes,
    },
    include: followUpInclude,
  });

  await logActivity({
    followUpId: input.id,
    type: "COMPLETED",
    fromStatus: existing.status,
    toStatus: "COMPLETED",
    actorId: input.actorId,
    note: input.notes?.trim() || null,
  });

  return updated;
}

export async function cancelFollowUp(input: {
  id: string;
  actorId?: string | null;
  notes?: string | null;
}) {
  const existing = await prisma.followUp.findUnique({ where: { id: input.id } });
  if (!existing) throw new Error("Follow-up not found");

  const updated = await prisma.followUp.update({
    where: { id: input.id },
    data: {
      status: "CANCELLED",
      notes:
        input.notes !== undefined
          ? input.notes?.trim() || null
          : existing.notes,
    },
    include: followUpInclude,
  });

  await logActivity({
    followUpId: input.id,
    type: "CANCELLED",
    fromStatus: existing.status,
    toStatus: "CANCELLED",
    actorId: input.actorId,
    note: input.notes?.trim() || null,
  });

  return updated;
}

export async function snoozeFollowUp(input: {
  id: string;
  /** YYYY-MM-DD or preset day offset via days */
  untilDate?: string;
  days?: number;
  actorId?: string | null;
  keepReminderOffset?: boolean;
}) {
  const existing = await prisma.followUp.findUnique({ where: { id: input.id } });
  if (!existing) throw new Error("Follow-up not found");
  if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
    throw new Error("Cannot snooze a completed or cancelled follow-up");
  }

  let newDue: DateParts;
  if (input.untilDate) {
    newDue = parseDateOnly(input.untilDate);
  } else if (typeof input.days === "number") {
    newDue = addCalendarDays(todayInBangkok(), input.days);
  } else {
    throw new Error("Provide untilDate or days");
  }

  const dueDate = toUtcDateOnly(newDue);

  // Preserve gap between due and reminder when possible
  let emailReminderDate = existing.emailReminderDate;
  if (existing.emailReminderEnabled && existing.emailReminderDate && input.keepReminderOffset !== false) {
    const oldDue = parseDateOnly(existing.dueDate);
    const oldRem = parseDateOnly(existing.emailReminderDate);
    const offsetDays =
      Math.round(
        (toUtcDateOnly(oldRem).getTime() - toUtcDateOnly(oldDue).getTime()) / 86400000
      );
    emailReminderDate = toUtcDateOnly(addCalendarDays(newDue, offsetDays));
  } else if (existing.emailReminderEnabled) {
    emailReminderDate = dueDate;
  }

  const updated = await prisma.followUp.update({
    where: { id: input.id },
    data: {
      dueDate,
      emailReminderDate,
      status: "SNOOZED",
      // Allow a new reminder after snooze if previously sent
      reminderSentAt: null,
      reminderStatus: existing.emailReminderEnabled ? "SCHEDULED" : "NONE",
      reminderSendMethod: null,
    },
    include: followUpInclude,
  });

  await logActivity({
    followUpId: input.id,
    type: "SNOOZED",
    fromStatus: existing.status,
    toStatus: "SNOOZED",
    actorId: input.actorId,
    note: `Snoozed until ${formatDateOnly(newDue)}`,
    meta: { previousDue: formatDateOnly(parseDateOnly(existing.dueDate)) },
  });

  return updated;
}

export async function assignFollowUp(input: {
  id: string;
  assignedStaffId: string | null;
  actorId?: string | null;
}) {
  return updateFollowUp(input.id, {
    assignedStaffId: input.assignedStaffId,
    actorId: input.actorId,
  });
}

export async function addFollowUpNote(input: {
  id: string;
  note: string;
  actorId?: string | null;
}) {
  const existing = await prisma.followUp.findUnique({ where: { id: input.id } });
  if (!existing) throw new Error("Follow-up not found");

  const note = input.note.trim();
  if (!note) throw new Error("Note is required");

  const combined = existing.notes ? `${existing.notes}\n\n${note}` : note;
  const updated = await prisma.followUp.update({
    where: { id: input.id },
    data: { notes: combined },
    include: followUpInclude,
  });

  await logActivity({
    followUpId: input.id,
    type: "NOTE_ADDED",
    actorId: input.actorId,
    note,
  });

  return updated;
}

export type ReminderSendResult =
  | { ok: true; followUpId: string; emailId?: string }
  | { ok: false; followUpId: string; skipped: true; reason: string }
  | { ok: false; followUpId: string; skipped?: false; reason: string };

/**
 * Send a production reminder. Sets reminderSentAt and reminderStatus=SENT.
 * Prevents duplicates via reminderSentAt + blocked statuses.
 */
export async function sendFollowUpReminder(input: {
  followUpId: string;
  method: FollowUpReminderSendMethod;
  actorId?: string | null;
  force?: boolean;
}): Promise<ReminderSendResult> {
  const followUp = await prisma.followUp.findUnique({
    where: { id: input.followUpId },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          notificationPreferences: true,
          preferredLocale: true,
        },
      },
      service: { select: { name: true } },
    },
  });

  if (!followUp) {
    return { ok: false, followUpId: input.followUpId, reason: "not_found" };
  }

  if (REMINDER_BLOCKED_STATUSES.has(followUp.status)) {
    return {
      ok: false,
      followUpId: followUp.id,
      skipped: true,
      reason: `status_${followUp.status.toLowerCase()}`,
    };
  }

  if (!followUp.emailReminderEnabled) {
    return {
      ok: false,
      followUpId: followUp.id,
      skipped: true,
      reason: "email_disabled",
    };
  }

  if (followUp.reminderSentAt && !input.force) {
    return {
      ok: false,
      followUpId: followUp.id,
      skipped: true,
      reason: "already_sent",
    };
  }

  const email = followUp.client.email?.trim();
  if (!email || !email.includes("@")) {
    await prisma.followUp.update({
      where: { id: followUp.id },
      data: { reminderStatus: "FAILED" },
    });
    await logActivity({
      followUpId: followUp.id,
      type: "EMAIL_FAILED",
      sendMethod: input.method,
      actorId: input.actorId,
      note: "Missing customer email",
    });
    return {
      ok: false,
      followUpId: followUp.id,
      skipped: true,
      reason: "missing_email",
    };
  }

  if (customerFollowUpOptedOut(followUp.client.notificationPreferences)) {
    await prisma.followUp.update({
      where: { id: followUp.id },
      data: { reminderStatus: "SKIPPED" },
    });
    await logActivity({
      followUpId: followUp.id,
      type: "EMAIL_SKIPPED",
      sendMethod: input.method,
      actorId: input.actorId,
      note: "Customer opted out of follow-up emails",
    });
    return {
      ok: false,
      followUpId: followUp.id,
      skipped: true,
      reason: "opted_out",
    };
  }

  const result = await sendFollowUpReminderEmail({
    to: email,
    customerName: followUp.client.name ?? "there",
    title: followUp.title,
    description: followUp.description,
    serviceName: followUp.service?.name ?? null,
    emailSubject: followUp.emailSubject,
    emailBody: followUp.emailBody,
    dueDate: followUp.dueDate,
    locale: followUp.client.preferredLocale === "th" ? "th" : "en",
  });

  if (!result.ok) {
    await prisma.followUp.update({
      where: { id: followUp.id },
      data: { reminderStatus: "FAILED" },
    });
    await logActivity({
      followUpId: followUp.id,
      type: "EMAIL_FAILED",
      sendMethod: input.method,
      actorId: input.actorId,
      note: result.error,
      meta: { skipped: Boolean(result.skipped) },
    });
    return {
      ok: false,
      followUpId: followUp.id,
      reason: result.error,
    };
  }

  await prisma.followUp.update({
    where: { id: followUp.id },
    data: {
      reminderSentAt: new Date(),
      reminderStatus: "SENT",
      reminderSendMethod: input.method,
      status:
        followUp.status === "PENDING" || followUp.status === "SNOOZED"
          ? "DUE"
          : followUp.status,
    },
  });

  // Keep linked driver's license renewal in sync
  await prisma.driverLicenseRenewal.updateMany({
    where: { followUpId: followUp.id, reminderSentAt: null },
    data: {
      reminderSentAt: new Date(),
      reminderSendMethod: input.method,
      status: "REMINDER_SENT",
    },
  });

  await logActivity({
    followUpId: followUp.id,
    type: "EMAIL_SENT",
    fromStatus: followUp.status,
    toStatus:
      followUp.status === "PENDING" || followUp.status === "SNOOZED"
        ? "DUE"
        : followUp.status,
    sendMethod: input.method,
    actorId: input.actorId,
    meta: { emailId: result.id },
  });

  return { ok: true, followUpId: followUp.id, emailId: result.id };
}

export type CronReminderSummary = {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  details: Array<{ followUpId: string; result: string }>;
};

/**
 * Daily cron: find open follow-ups whose emailReminderDate is today or overdue,
 * and that have not yet been reminded.
 */
export async function processDueFollowUpReminders(
  now: Date = new Date()
): Promise<CronReminderSummary> {
  const today = todayInBangkok(now);
  const todayUtc = toUtcDateOnly(today);

  // Mark overdue PENDING/SNOOZED as DUE
  await prisma.followUp.updateMany({
    where: {
      status: { in: ["PENDING", "SNOOZED"] },
      dueDate: { lte: todayUtc },
    },
    data: { status: "DUE" },
  });

  const due = await prisma.followUp.findMany({
    where: {
      emailReminderEnabled: true,
      reminderSentAt: null,
      status: { in: OPEN_FOLLOW_UP_STATUSES },
      emailReminderDate: { lte: todayUtc },
    },
    select: { id: true },
    orderBy: { emailReminderDate: "asc" },
  });

  const summary: CronReminderSummary = {
    processed: due.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  for (const row of due) {
    try {
      const result = await sendFollowUpReminder({
        followUpId: row.id,
        method: "AUTOMATIC",
      });
      if (result.ok) {
        summary.sent += 1;
        summary.details.push({ followUpId: row.id, result: "sent" });
      } else if ("skipped" in result && result.skipped) {
        summary.skipped += 1;
        summary.details.push({
          followUpId: row.id,
          result: `skipped:${result.reason}`,
        });
      } else {
        summary.failed += 1;
        summary.details.push({
          followUpId: row.id,
          result: `failed:${result.reason}`,
        });
      }
    } catch (err) {
      summary.failed += 1;
      const message = err instanceof Error ? err.message : "unknown_error";
      summary.details.push({ followUpId: row.id, result: `failed:${message}` });
      console.error("[followup-cron] failed for", row.id, err);
    }
  }

  return summary;
}

export function computeDueFromRelative(input: {
  anchor: string | Date;
  value: number;
  unit: RelativeDateUnit;
  direction: RelativeDateDirection;
}): string {
  return formatDateOnly(
    applyRelativeDate({
      anchor: input.anchor,
      value: input.value,
      unit: input.unit,
      direction: input.direction,
    })
  );
}

export { followUpInclude };

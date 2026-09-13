import { prisma } from "@/lib/db";
import {
  calculateRenewalDates,
  compareDateOnly,
  formatDateOnly,
  parseDateOnly,
  subtractCalendarMonths,
  todayInBangkok,
  toUtcDateOnly,
} from "@/lib/driver-license-renewal/dates";
import {
  ACTIVE_FOLLOW_UP_STATUSES,
  REMINDER_BLOCKED_STATUSES,
} from "@/lib/driver-license-renewal/constants";
import { createFollowUp, sendFollowUpReminder } from "@/lib/follow-ups/service";
import { sendDriverLicenseRenewalReminderEmail } from "@/lib/email/messages";
import { parseNotificationPreferences } from "@/lib/notification-preferences";
import type {
  DriverLicenseActivityType,
  DriverLicenseFollowUpStatus,
  DriverLicenseReminderSendMethod,
  DriverLicenseRenewalType,
  Prisma,
} from "@prisma/client";

export type CreateRenewalInput = {
  clientId: string;
  caseId?: string | null;
  assignedStaffId?: string | null;
  renewalType: DriverLicenseRenewalType;
  previousLicenseType?: string | null;
  issueDate: string;
  expiryDate?: string | null;
  notes?: string | null;
  actorId?: string | null;
};

export type UpdateRenewalInput = {
  renewalType?: DriverLicenseRenewalType;
  previousLicenseType?: string | null;
  issueDate?: string;
  expiryDate?: string | null;
  notes?: string | null;
  assignedStaffId?: string | null;
  nextRenewalDate?: string;
  reminderDate?: string;
  actorId?: string | null;
};

async function logActivity(input: {
  renewalId: string;
  type: DriverLicenseActivityType;
  fromStatus?: DriverLicenseFollowUpStatus | null;
  toStatus?: DriverLicenseFollowUpStatus | null;
  sendMethod?: DriverLicenseReminderSendMethod | null;
  note?: string | null;
  actorId?: string | null;
  meta?: Prisma.InputJsonValue;
}) {
  return prisma.driverLicenseRenewalActivity.create({
    data: {
      renewalId: input.renewalId,
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

function deriveInitialStatus(reminderDate: Date, now: Date = new Date()): DriverLicenseFollowUpStatus {
  const today = todayInBangkok(now);
  const reminder = parseDateOnly(reminderDate);
  if (compareDateOnly(reminder, today) <= 0) return "REMINDER_DUE";
  return "UPCOMING";
}

async function resolveDriverLicenseServiceId(caseId?: string | null) {
  if (caseId) {
    const linked = await prisma.case.findUnique({
      where: { id: caseId },
      select: { serviceId: true },
    });
    if (linked) return linked.serviceId;
  }
  const service = await prisma.service.findUnique({
    where: { slug: "driver-license" },
    select: { id: true },
  });
  return service?.id ?? null;
}

/**
 * Create a DL specialty record + linked generalized FollowUp (RENEWAL).
 * FollowUp.dueDate / emailReminderDate = one calendar month before expiry.
 */
export async function createDriverLicenseRenewal(input: CreateRenewalInput) {
  const client = await prisma.user.findFirst({
    where: { id: input.clientId, role: "customer" },
    select: { id: true, name: true },
  });
  if (!client) throw new Error("Client not found");

  if (input.caseId) {
    const linkedCase = await prisma.case.findUnique({
      where: { id: input.caseId },
      select: { id: true, userId: true },
    });
    if (!linkedCase) throw new Error("Case not found");
  }

  const dates = calculateRenewalDates({
    issueDate: input.issueDate,
    expiryDate: input.expiryDate,
  });
  const status = deriveInitialStatus(dates.reminderDate);
  const serviceId = await resolveDriverLicenseServiceId(input.caseId);
  const reminderYmd = formatDateOnly(dates.reminderParts);
  const expiryYmd = formatDateOnly(dates.expiryParts);

  const followUp = await createFollowUp({
    clientId: input.clientId,
    caseId: input.caseId ?? null,
    serviceId,
    title: "Driver's License Renewal Reminder",
    description: `Thai driver's license expires ${expiryYmd}. Follow up about renewal assistance.`,
    followUpType: "RENEWAL",
    dueDate: reminderYmd,
    priority: "HIGH",
    assignedStaffId: input.assignedStaffId ?? null,
    emailReminderEnabled: true,
    emailReminderDate: reminderYmd,
    emailSubject: "Your Thai Driver's License Renewal is Coming Up – SiamEZ",
    notes: input.notes?.trim() || null,
    createdById: input.actorId ?? null,
    metadata: {
      domain: "driver_license_renewal",
      renewalType: input.renewalType,
      issueDate: input.issueDate,
      expiryDate: expiryYmd,
      nextRenewalDate: expiryYmd,
    },
  });

  const renewal = await prisma.driverLicenseRenewal.create({
    data: {
      clientId: input.clientId,
      caseId: input.caseId ?? null,
      assignedStaffId: input.assignedStaffId ?? null,
      followUpId: followUp.id,
      previousLicenseType: input.previousLicenseType?.trim() || null,
      renewalType: input.renewalType,
      issueDate: dates.issueDate,
      expiryDate: dates.expiryDate,
      nextRenewalDate: dates.nextRenewalDate,
      reminderDate: dates.reminderDate,
      status,
      notes: input.notes?.trim() || null,
    },
  });

  await logActivity({
    renewalId: renewal.id,
    type: "CREATED",
    toStatus: status,
    actorId: input.actorId,
    note: "Driver's license renewal follow-up created",
    meta: {
      renewalType: input.renewalType,
      issueDate: input.issueDate,
      expiryDate: expiryYmd,
      followUpId: followUp.id,
    },
  });

  return { ...renewal, followUp };
}

export async function updateDriverLicenseRenewal(id: string, input: UpdateRenewalInput) {
  const existing = await prisma.driverLicenseRenewal.findUnique({ where: { id } });
  if (!existing) throw new Error("Renewal not found");

  const issueDate = input.issueDate ?? existing.issueDate.toISOString().slice(0, 10);
  const expiryDate =
    input.expiryDate !== undefined
      ? input.expiryDate
      : existing.expiryDate.toISOString().slice(0, 10);

  const dates = calculateRenewalDates({ issueDate, expiryDate });

  const nextRenewalDate = input.nextRenewalDate
    ? toUtcDateOnly(parseDateOnly(input.nextRenewalDate))
    : dates.nextRenewalDate;
  const reminderDate = input.reminderDate
    ? toUtcDateOnly(parseDateOnly(input.reminderDate))
    : input.nextRenewalDate
      ? toUtcDateOnly(subtractCalendarMonths(parseDateOnly(nextRenewalDate), 1))
      : dates.reminderDate;

  let status = existing.status;
  if (
    !existing.reminderSentAt &&
    (status === "UPCOMING" || status === "REMINDER_DUE")
  ) {
    status = deriveInitialStatus(reminderDate);
  }

  const updated = await prisma.driverLicenseRenewal.update({
    where: { id },
    data: {
      renewalType: input.renewalType ?? existing.renewalType,
      previousLicenseType:
        input.previousLicenseType !== undefined
          ? input.previousLicenseType?.trim() || null
          : existing.previousLicenseType,
      issueDate: dates.issueDate,
      expiryDate: input.nextRenewalDate ? nextRenewalDate : dates.expiryDate,
      nextRenewalDate,
      reminderDate,
      assignedStaffId:
        input.assignedStaffId !== undefined ? input.assignedStaffId : existing.assignedStaffId,
      notes: input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
      status,
    },
  });

  if (existing.followUpId) {
    const remYmd = formatDateOnly(parseDateOnly(reminderDate));
    await prisma.followUp.update({
      where: { id: existing.followUpId },
      data: {
        dueDate: reminderDate,
        emailReminderDate: reminderDate,
        assignedStaffId:
          input.assignedStaffId !== undefined
            ? input.assignedStaffId
            : existing.assignedStaffId,
        notes: input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
        metadata: {
          domain: "driver_license_renewal",
          renewalType: updated.renewalType,
          issueDate: formatDateOnly(parseDateOnly(updated.issueDate)),
          expiryDate: formatDateOnly(parseDateOnly(updated.expiryDate)),
          nextRenewalDate: formatDateOnly(parseDateOnly(updated.nextRenewalDate)),
        },
        ...(existing.reminderSentAt
          ? {}
          : {
              reminderSentAt: null,
              reminderStatus: "SCHEDULED" as const,
            }),
      },
    });
    void remYmd;
  }

  await logActivity({
    renewalId: id,
    type: input.nextRenewalDate || input.reminderDate ? "RESCHEDULED" : "UPDATED",
    fromStatus: existing.status,
    toStatus: status,
    actorId: input.actorId,
  });

  return updated;
}

export async function setDriverLicenseRenewalStatus(input: {
  id: string;
  status: DriverLicenseFollowUpStatus;
  notes?: string | null;
  actorId?: string | null;
}) {
  const existing = await prisma.driverLicenseRenewal.findUnique({ where: { id: input.id } });
  if (!existing) throw new Error("Renewal not found");

  const activityType: DriverLicenseActivityType =
    input.status === "CONTACTED"
      ? "CONTACTED"
      : input.status === "RENEWED"
        ? "RENEWED"
        : input.status === "CANCELLED"
          ? "CANCELLED"
          : input.status === "NOT_INTERESTED"
            ? "NOT_INTERESTED"
            : "STATUS_CHANGED";

  const updated = await prisma.driverLicenseRenewal.update({
    where: { id: input.id },
    data: {
      status: input.status,
      notes:
        input.notes !== undefined
          ? input.notes?.trim() || null
          : existing.notes,
    },
  });

  if (existing.followUpId) {
    if (input.status === "RENEWED" || input.status === "CANCELLED" || input.status === "NOT_INTERESTED") {
      await prisma.followUp.update({
        where: { id: existing.followUpId },
        data: {
          status: input.status === "RENEWED" ? "COMPLETED" : "CANCELLED",
          completedAt: input.status === "RENEWED" ? new Date() : null,
          completedById: input.status === "RENEWED" ? input.actorId ?? null : null,
        },
      });
    } else if (input.status === "CONTACTED") {
      await prisma.followUp.update({
        where: { id: existing.followUpId },
        data: { status: "IN_PROGRESS" },
      });
    }
  }

  await logActivity({
    renewalId: input.id,
    type: activityType,
    fromStatus: existing.status,
    toStatus: input.status,
    actorId: input.actorId,
    note: input.notes?.trim() || null,
  });

  return updated;
}

export type ReminderSendResult =
  | { ok: true; renewalId: string; emailId?: string; skipped?: never; reason?: never }
  | { ok: false; renewalId: string; skipped: true; reason: string }
  | { ok: false; renewalId: string; skipped?: false; reason: string };

function customerEmailOptedOut(prefs: unknown): boolean {
  const parsed = parseNotificationPreferences(prefs);
  if (parsed.emailRenewalReminders === false) return true;
  if (parsed.emailFollowUpReminders === false) return true;
  return false;
}

/**
 * Prefer the linked FollowUp reminder path; fall back to DL-specific email.
 */
export async function sendDriverLicenseReminder(input: {
  renewalId: string;
  method: DriverLicenseReminderSendMethod;
  actorId?: string | null;
  force?: boolean;
}): Promise<ReminderSendResult> {
  const renewal = await prisma.driverLicenseRenewal.findUnique({
    where: { id: input.renewalId },
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
    },
  });

  if (!renewal) {
    return { ok: false, renewalId: input.renewalId, reason: "not_found" };
  }

  if (REMINDER_BLOCKED_STATUSES.has(renewal.status)) {
    return {
      ok: false,
      renewalId: renewal.id,
      skipped: true,
      reason: `status_${renewal.status.toLowerCase()}`,
    };
  }

  if (renewal.reminderSentAt && !input.force) {
    return {
      ok: false,
      renewalId: renewal.id,
      skipped: true,
      reason: "already_sent",
    };
  }

  // Prefer generalized FollowUp engine when linked
  if (renewal.followUpId) {
    const result = await sendFollowUpReminder({
      followUpId: renewal.followUpId,
      method: input.method,
      actorId: input.actorId,
      force: input.force,
    });
    if (result.ok) {
      await prisma.driverLicenseRenewal.update({
        where: { id: renewal.id },
        data: {
          reminderSentAt: new Date(),
          reminderSentById: input.actorId ?? null,
          reminderSendMethod: input.method,
          status: "REMINDER_SENT",
        },
      });
      await logActivity({
        renewalId: renewal.id,
        type: "REMINDER_SENT",
        fromStatus: renewal.status,
        toStatus: "REMINDER_SENT",
        sendMethod: input.method,
        actorId: input.actorId,
        meta: { emailId: result.emailId, via: "follow_up" },
      });
      return { ok: true, renewalId: renewal.id, emailId: result.emailId };
    }
    if ("skipped" in result && result.skipped) {
      // FollowUp may already have sent (cron order) — mirror onto the DL record.
      if (result.reason === "already_sent") {
        await prisma.driverLicenseRenewal.update({
          where: { id: renewal.id },
          data: {
            reminderSentAt: new Date(),
            reminderSendMethod: input.method,
            status: "REMINDER_SENT",
          },
        });
      }
      return {
        ok: false,
        renewalId: renewal.id,
        skipped: true,
        reason: result.reason,
      };
    }
    return { ok: false, renewalId: renewal.id, reason: result.reason };
  }

  const email = renewal.client.email?.trim();
  if (!email || !email.includes("@")) {
    await logActivity({
      renewalId: renewal.id,
      type: "REMINDER_FAILED",
      sendMethod: input.method,
      actorId: input.actorId,
      note: "Missing customer email",
    });
    return {
      ok: false,
      renewalId: renewal.id,
      skipped: true,
      reason: "missing_email",
    };
  }

  if (customerEmailOptedOut(renewal.client.notificationPreferences)) {
    return {
      ok: false,
      renewalId: renewal.id,
      skipped: true,
      reason: "opted_out",
    };
  }

  const result = await sendDriverLicenseRenewalReminderEmail({
    to: email,
    customerName: renewal.client.name ?? "there",
    expiryDate: renewal.expiryDate,
    renewalDate: renewal.nextRenewalDate,
    isTest: false,
    locale: renewal.client.preferredLocale === "th" ? "th" : "en",
  });

  if (!result.ok) {
    await logActivity({
      renewalId: renewal.id,
      type: "REMINDER_FAILED",
      sendMethod: input.method,
      actorId: input.actorId,
      note: result.error,
      meta: { skipped: Boolean(result.skipped) },
    });
    return {
      ok: false,
      renewalId: renewal.id,
      reason: result.error,
    };
  }

  await prisma.driverLicenseRenewal.update({
    where: { id: renewal.id },
    data: {
      reminderSentAt: new Date(),
      reminderSentById: input.actorId ?? null,
      reminderSendMethod: input.method,
      status: "REMINDER_SENT",
    },
  });

  // Keep linked FollowUp in sync when present
  if (renewal.followUpId) {
    await prisma.followUp.update({
      where: { id: renewal.followUpId },
      data: {
        reminderSentAt: new Date(),
        reminderStatus: "SENT",
        reminderSendMethod: input.method,
        status: "IN_PROGRESS",
      },
    });
  }

  await logActivity({
    renewalId: renewal.id,
    type: "REMINDER_SENT",
    fromStatus: renewal.status,
    toStatus: "REMINDER_SENT",
    sendMethod: input.method,
    actorId: input.actorId,
    meta: { emailId: result.id },
  });

  return { ok: true, renewalId: renewal.id, emailId: result.id };
}

/** Test reminder — does NOT mutate reminderSentAt or status. */
export async function sendDriverLicenseTestReminder(input: {
  renewalId: string;
  actorId?: string | null;
}): Promise<ReminderSendResult> {
  const renewal = await prisma.driverLicenseRenewal.findUnique({
    where: { id: input.renewalId },
    include: {
      client: {
        select: {
          name: true,
          email: true,
          preferredLocale: true,
        },
      },
    },
  });

  if (!renewal) {
    return { ok: false, renewalId: input.renewalId, reason: "not_found" };
  }

  const email = renewal.client.email?.trim();
  if (!email || !email.includes("@")) {
    return {
      ok: false,
      renewalId: renewal.id,
      skipped: true,
      reason: "missing_email",
    };
  }

  const result = await sendDriverLicenseRenewalReminderEmail({
    to: email,
    customerName: renewal.client.name ?? "there",
    expiryDate: renewal.expiryDate,
    renewalDate: renewal.nextRenewalDate,
    isTest: true,
    locale: renewal.client.preferredLocale === "th" ? "th" : "en",
  });

  await logActivity({
    renewalId: renewal.id,
    type: result.ok ? "REMINDER_TEST" : "REMINDER_FAILED",
    sendMethod: "MANUAL",
    actorId: input.actorId,
    note: result.ok ? "Test reminder sent" : result.error,
    meta: result.ok ? { emailId: result.id, test: true } : { test: true, error: result.error },
  });

  if (!result.ok) {
    return { ok: false, renewalId: renewal.id, reason: result.error };
  }
  return { ok: true, renewalId: renewal.id, emailId: result.id };
}

export type CronReminderSummary = {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  details: Array<{ renewalId: string; result: string }>;
};

/**
 * Daily cron for DL renewals not yet linked to FollowUp.
 * Linked renewals are handled by the generalized follow-up cron.
 */
export async function processDueDriverLicenseReminders(
  now: Date = new Date()
): Promise<CronReminderSummary> {
  const today = todayInBangkok(now);
  const todayUtc = toUtcDateOnly(today);

  const due = await prisma.driverLicenseRenewal.findMany({
    where: {
      reminderSentAt: null,
      followUpId: null,
      status: { in: ["UPCOMING", "REMINDER_DUE"] },
      reminderDate: { lte: todayUtc },
    },
    select: { id: true },
    orderBy: { reminderDate: "asc" },
  });

  await prisma.driverLicenseRenewal.updateMany({
    where: {
      id: { in: due.map((d) => d.id) },
      status: "UPCOMING",
    },
    data: { status: "REMINDER_DUE" },
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
      const result = await sendDriverLicenseReminder({
        renewalId: row.id,
        method: "AUTOMATIC",
      });
      if (result.ok) {
        summary.sent += 1;
        summary.details.push({ renewalId: row.id, result: "sent" });
      } else if (result.skipped) {
        summary.skipped += 1;
        summary.details.push({ renewalId: row.id, result: `skipped:${result.reason}` });
      } else {
        summary.failed += 1;
        summary.details.push({ renewalId: row.id, result: `failed:${result.reason}` });
      }
    } catch (err) {
      summary.failed += 1;
      const message = err instanceof Error ? err.message : "unknown_error";
      summary.details.push({ renewalId: row.id, result: `failed:${message}` });
      console.error("[dl-renewal-cron] failed for", row.id, err);
    }
  }

  return summary;
}

export async function getDriverLicenseRenewalStats(now: Date = new Date()) {
  const today = todayInBangkok(now);

  const addDaysParts = (parts: typeof today, days: number) => {
    const d = toUtcDateOnly(parts);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
  };

  const todayDate = toUtcDateOnly(today);
  const end30 = addDaysParts(today, 30);
  const end90 = addDaysParts(today, 90);
  const activeWhere = { status: { in: ACTIVE_FOLLOW_UP_STATUSES } };

  const [
    renewalsNext30,
    renewalsNext90,
    remindersDue,
    remindersSent,
    contacted,
    renewed,
    overdue,
  ] = await Promise.all([
    prisma.driverLicenseRenewal.count({
      where: {
        ...activeWhere,
        nextRenewalDate: { gte: todayDate, lte: end30 },
      },
    }),
    prisma.driverLicenseRenewal.count({
      where: {
        ...activeWhere,
        nextRenewalDate: { gte: todayDate, lte: end90 },
      },
    }),
    prisma.driverLicenseRenewal.count({
      where: {
        status: { in: ["UPCOMING", "REMINDER_DUE"] },
        reminderSentAt: null,
        reminderDate: { lte: todayDate },
      },
    }),
    prisma.driverLicenseRenewal.count({ where: { status: "REMINDER_SENT" } }),
    prisma.driverLicenseRenewal.count({ where: { status: "CONTACTED" } }),
    prisma.driverLicenseRenewal.count({ where: { status: "RENEWED" } }),
    prisma.driverLicenseRenewal.count({
      where: {
        status: { in: ACTIVE_FOLLOW_UP_STATUSES },
        nextRenewalDate: { lt: todayDate },
      },
    }),
  ]);

  return {
    renewalsNext30,
    renewalsNext90,
    remindersDue,
    remindersSent,
    contacted,
    renewed,
    overdue,
  };
}

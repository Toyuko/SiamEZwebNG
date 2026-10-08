import { Prisma, type CaseStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertCaseStatusTransition } from "@/lib/domain/case-status";
import { normalizeProvince } from "@/lib/calendar/provinces";
import {
  calendarSummary,
  eventWindow,
  filterCalendarJobs,
  isUnscheduledJob,
  planBackfill,
  schedulingWarnings,
  toPublicSlot,
  type CalendarFilters,
  type CalendarJobRecord,
  type ScheduleWarning,
} from "@/lib/calendar/schedule";
import {
  JOB_INTAKE_DEPOSIT_SOURCE,
  JobIntakeValidationError,
  caseServiceName,
  bangkokDateTime,
  displayInvoiceNumber,
  formatBangkokDate,
  formatBangkokTime,
  parseDocumentsRequired,
  staffDisplayName,
} from "@/lib/jobs/intake";
import { resolveStaffActor, syncScheduleFromCase } from "@/data-access/job-intake";

const calendarInclude = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  service: { select: { id: true, name: true } },
  salesPerson: { select: { id: true, name: true, email: true } },
  staffAssignments: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  invoices: {
    orderBy: { createdAt: "desc" as const },
    include: { payments: { select: { amount: true, status: true, metadata: true, receiptNumber: true } } },
  },
  events: { select: { id: true, primaryForCaseId: true, description: true } },
} satisfies Prisma.CaseInclude;

type CalendarRow = Prisma.CaseGetPayload<{ include: typeof calendarInclude }>;

function toRecord(row: CalendarRow): CalendarJobRecord {
  const invoice = row.invoices[0] ?? null;
  const approved = row.invoices.flatMap((item) => item.payments).filter((payment) => payment.status === "approved");
  const paid = approved.reduce((sum, payment) => sum + payment.amount, 0);
  const depositFromIntake = approved
    .filter((payment) => (payment.metadata as { source?: string } | null)?.source === JOB_INTAKE_DEPOSIT_SOURCE)
    .reduce((sum, payment) => sum + payment.amount, 0);
  const totalSatang = invoice?.amount ?? row.dealValue ?? 0;
  const depositSatang = depositFromIntake || Math.min(paid, invoice?.depositAmount ?? paid);
  const assigned = row.staffAssignments[0]?.user ?? null;
  return {
    caseId: row.id,
    caseNumber: row.caseNumber,
    customerName: row.user?.name ?? row.guestName ?? "Customer",
    customerPhone: row.user?.phone ?? row.guestPhone,
    customerEmail: row.user?.email ?? row.guestEmail,
    serviceId: row.serviceId,
    serviceName: caseServiceName(row),
    staffId: assigned?.id ?? null,
    staffName: assigned ? staffDisplayName(assigned) : "TBD",
    closedByName: row.salesPerson ? staffDisplayName(row.salesPerson) : null,
    start: row.scheduledAt?.toISOString() ?? null,
    allDay: row.scheduleTimeTbd,
    province: row.province,
    location: row.location,
    status: row.status,
    invoiceId: invoice?.id ?? null,
    invoiceNumber: invoice ? displayInvoiceNumber(invoice) : null,
    totalSatang,
    depositSatang,
    outstandingSatang: Math.max(0, totalSatang - paid),
    documents: parseDocumentsRequired(row.documentsRequired),
    description: row.jobDescription,
  };
}

const ACTIVE_UNSCHEDULED: CaseStatus[] = ["confirmed", "in_progress", "pending_docs"];

function rangeWhere(start: Date, end: Date, filters: CalendarFilters, searching: boolean): Prisma.CaseWhereInput {
  const where: Prisma.CaseWhereInput = searching ? { scheduledAt: { not: null } } : { scheduledAt: { gte: start, lt: end } };
  if (filters.provinces.length > 0) where.province = { in: filters.provinces };
  if (filters.staffId === "tbd") where.staffAssignments = { none: {} };
  else if (filters.staffId) where.staffAssignments = { some: { userId: filters.staffId } };
  if (filters.serviceId) where.serviceId = filters.serviceId;
  if (filters.status === "confirmed" || filters.status === "completed" || filters.status === "cancelled") {
    where.status = filters.status;
  }
  if (filters.status === "tbd") where.scheduleTimeTbd = true;
  if (filters.status === "scheduled") {
    where.scheduleTimeTbd = false;
    where.status = { notIn: ["cancelled", "completed"] };
  }
  return where;
}

export async function loadCompanyCalendar(input: {
  start: Date;
  end: Date;
  filters: CalendarFilters;
  includeHealth: boolean;
}) {
  const q = input.filters.q.trim();
  const searching = q.length >= 2;
  const where = rangeWhere(input.start, input.end, input.filters, searching);
  if (searching) {
    where.OR = [
      { guestName: { contains: q, mode: "insensitive" } },
      { guestEmail: { contains: q, mode: "insensitive" } },
      { guestPhone: { contains: q, mode: "insensitive" } },
      { id: { contains: q, mode: "insensitive" } },
      { caseNumber: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { otherServiceName: { contains: q, mode: "insensitive" } },
      { province: { contains: q, mode: "insensitive" } },
      { user: { is: { name: { contains: q, mode: "insensitive" } } } },
      { user: { is: { email: { contains: q, mode: "insensitive" } } } },
      { user: { is: { phone: { contains: q, mode: "insensitive" } } } },
      { service: { is: { name: { contains: q, mode: "insensitive" } } } },
      { invoices: { some: { invoiceNumber: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [rows, unscheduledRows, otherEvents, health] = await Promise.all([
    prisma.case.findMany({
      where,
      include: calendarInclude,
      orderBy: { scheduledAt: "asc" },
      take: searching ? 80 : 400,
    }),
    prisma.case.findMany({
      where: { scheduledAt: null, status: { in: ACTIVE_UNSCHEDULED } },
      include: calendarInclude,
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
    prisma.event.findMany({
      where: { caseId: null, start: { lt: input.end }, end: { gt: input.start } },
      select: { id: true, title: true, start: true, end: true, allDay: true },
      orderBy: { start: "asc" },
      take: 50,
    }),
    input.includeHealth ? calendarHealth() : Promise.resolve(null),
  ]);

  const jobs = filterCalendarJobs(rows.map(toRecord), input.filters);
  const unscheduled = unscheduledRows.map(toRecord).filter((job) => isUnscheduledJob({ scheduledAt: null, status: job.status }));
  return {
    jobs,
    unscheduled,
    otherEvents: otherEvents.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      allDay: event.allDay,
    })),
    summary: calendarSummary(jobs),
    health,
    truncated: rows.length >= (searching ? 80 : 400),
  };
}

export async function listPublicAvailability(start: Date, end: Date) {
  const rows = await prisma.case.findMany({
    where: {
      scheduledAt: { gte: start, lt: end },
      status: { notIn: ["cancelled", "refunded", "refund_pending"] },
    },
    select: {
      scheduledAt: true,
      scheduleTimeTbd: true,
      province: true,
      status: true,
      otherServiceName: true,
      service: { select: { name: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 500,
  });
  return rows.flatMap((row) => {
    if (!row.scheduledAt) return [];
    const slot = toPublicSlot({
      start: row.scheduledAt,
      allDay: row.scheduleTimeTbd,
      province: row.province,
      serviceName: row.service?.name ?? row.otherServiceName ?? "Service",
      status: row.status,
    });
    return slot ? [slot] : [];
  });
}

async function calendarHealth() {
  const [scheduled, linked, missing, unscheduled, duplicateGroups] = await Promise.all([
    prisma.case.count({ where: { scheduledAt: { not: null } } }),
    prisma.event.count({ where: { primaryForCaseId: { not: null } } }),
    prisma.case.count({
      where: { scheduledAt: { not: null }, events: { none: { primaryForCaseId: { not: null } } } },
    }),
    prisma.case.count({ where: { scheduledAt: null, status: { in: ACTIVE_UNSCHEDULED } } }),
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM (
        SELECT case_id FROM events
        WHERE case_id IS NOT NULL AND description LIKE '%[job-intake]%'
        GROUP BY case_id
        HAVING COUNT(*) > 1
      ) duplicates
    `,
  ]);
  return {
    scheduled,
    linked,
    missing,
    duplicates: Number(duplicateGroups[0]?.count ?? 0),
    unscheduled,
  };
}

export async function syncExistingJobsToCalendar(actor: { id: string; email: string }) {
  await resolveStaffActor(actor);
  const rows = await prisma.case.findMany({
    where: {
      OR: [{ scheduledAt: { not: null } }, { scheduledAt: null, status: { in: ACTIVE_UNSCHEDULED } }],
    },
    select: {
      id: true,
      scheduledAt: true,
      events: { select: { primaryForCaseId: true, description: true } },
    },
  });
  const plan = planBackfill(
    rows.map((row) => ({
      caseId: row.id,
      scheduledAt: row.scheduledAt,
      primaryEventId:
        row.events.find((event) => event.primaryForCaseId === row.id)?.primaryForCaseId ??
        (row.events.some((event) => event.description?.includes("[job-intake]")) ? "marker" : null),
    }))
  );
  let errors = 0;
  for (const row of rows) {
    if (!row.scheduledAt) continue;
    try {
      await prisma.$transaction((tx) => syncScheduleFromCase(tx, row.id));
    } catch (error) {
      errors += 1;
      console.error("Calendar sync failed", row.id, error);
    }
  }
  return { ...plan, errors };
}

async function warningsFor(
  caseId: string,
  staffId: string | null,
  staffName: string,
  start: Date,
  allDay: boolean,
  province: string | null
): Promise<ScheduleWarning[]> {
  if (!staffId) return [];
  const windowStart = new Date(start.getTime() - 4 * 60 * 60 * 1000);
  const windowEnd = new Date(start.getTime() + 4 * 60 * 60 * 1000);
  const others = await prisma.case.findMany({
    where: {
      id: { not: caseId },
      scheduledAt: { gte: windowStart, lt: windowEnd },
      staffAssignments: { some: { userId: staffId } },
    },
    select: {
      id: true,
      guestName: true,
      province: true,
      scheduledAt: true,
      scheduleTimeTbd: true,
      status: true,
      user: { select: { name: true } },
      staffAssignments: { select: { userId: true, user: { select: { name: true } } } },
    },
  });
  const candidateWindow = eventWindow(start, allDay);
  return schedulingWarnings(
    { caseId, staffId, staffName, province, ...candidateWindow },
    others.flatMap((row) => {
      if (!row.scheduledAt) return [];
      const assigned = row.staffAssignments[0];
      const span = eventWindow(row.scheduledAt, row.scheduleTimeTbd);
      return [
        {
          caseId: row.id,
          staffId: assigned?.userId ?? null,
          staffName: assigned?.user.name ?? staffName,
          customerName: row.user?.name ?? row.guestName ?? "Customer",
          province: row.province,
          status: row.status,
          ...span,
        },
      ];
    })
  );
}

export async function rescheduleJob(
  actor: { id: string; email: string },
  caseId: string,
  input: { date: string; time: string | null; timeTbd: boolean; acknowledge: boolean }
): Promise<{ warnings: ScheduleWarning[] }> {
  const actorId = await resolveStaffActor(actor);
  const existing = await prisma.case.findUnique({
    where: { id: caseId },
    include: { staffAssignments: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });
  if (!existing) throw new Error("Job not found");
  const clock = input.timeTbd ? "00:00" : input.time?.trim() || "";
  const scheduledAt = clock ? bangkokDateTime(input.date, clock) : null;
  if (!scheduledAt) {
    throw new JobIntakeValidationError("Check the highlighted fields.", { scheduledDate: "Enter a valid date and time." });
  }
  const assigned = existing.staffAssignments[0]?.user ?? null;
  if (!input.acknowledge) {
    const warnings = await warningsFor(
      caseId,
      assigned?.id ?? null,
      assigned ? staffDisplayName(assigned) : "TBD",
      scheduledAt,
      input.timeTbd,
      existing.province
    );
    if (warnings.length > 0) return { warnings };
  }
  const when = input.timeTbd ? `${formatBangkokDate(scheduledAt)}, time TBD` : `${formatBangkokDate(scheduledAt)} ${formatBangkokTime(scheduledAt)}`;
  await prisma.$transaction(async (tx) => {
    await tx.case.update({
      where: { id: caseId },
      data: { scheduledAt, scheduleTimeTbd: input.timeTbd, updatedById: actorId },
    });
    await tx.caseNote.create({
      data: { caseId, userId: actorId, content: `Rescheduled to ${when}.`, isInternal: true },
    });
    await syncScheduleFromCase(tx, caseId);
  });
  return { warnings: [] };
}

export async function assignCalendarStaff(
  actor: { id: string; email: string },
  caseId: string,
  staffId: string | null
) {
  const actorId = await resolveStaffActor(actor);
  const existing = await prisma.case.findUnique({ where: { id: caseId }, select: { id: true } });
  if (!existing) throw new Error("Job not found");
  let staffName = "TBD";
  if (staffId) {
    const staff = await prisma.user.findFirst({
      where: { id: staffId, active: true, role: { in: ["admin", "staff"] } },
      select: { id: true, name: true, email: true },
    });
    if (!staff) throw new Error("Job not found");
    staffName = staffDisplayName(staff);
  }
  await prisma.$transaction(async (tx) => {
    await tx.staffAssignment.deleteMany({ where: { caseId } });
    if (staffId) {
      await tx.staffAssignment.create({ data: { caseId, userId: staffId, role: "primary" } });
    }
    await tx.case.update({ where: { id: caseId }, data: { updatedById: actorId } });
    await tx.caseNote.create({
      data: { caseId, userId: actorId, content: `Assigned staff changed to ${staffName}.`, isInternal: true },
    });
    await syncScheduleFromCase(tx, caseId);
  });
}

export async function assignCalendarProvince(
  actor: { id: string; email: string },
  caseId: string,
  provinceRaw: string | null
) {
  const actorId = await resolveStaffActor(actor);
  const province = normalizeProvince(provinceRaw);
  if (provinceRaw?.trim() && !province) {
    throw new JobIntakeValidationError("Check the highlighted fields.", { province: "Choose a province from the list." });
  }
  const existing = await prisma.case.findUnique({ where: { id: caseId }, select: { id: true } });
  if (!existing) throw new Error("Job not found");
  await prisma.$transaction(async (tx) => {
    await tx.case.update({ where: { id: caseId }, data: { province, updatedById: actorId } });
    await tx.caseNote.create({
      data: {
        caseId,
        userId: actorId,
        content: province ? `Province set to ${province}.` : "Province cleared.",
        isInternal: true,
      },
    });
    await syncScheduleFromCase(tx, caseId);
  });
}

export async function setCalendarJobStatus(
  actor: { id: string; email: string },
  caseId: string,
  status: CaseStatus
) {
  const actorId = await resolveStaffActor(actor);
  const existing = await prisma.case.findUnique({ where: { id: caseId }, select: { id: true, status: true } });
  if (!existing) throw new Error("Job not found");
  assertCaseStatusTransition(existing.status, status);
  await prisma.$transaction(async (tx) => {
    await tx.case.update({
      where: { id: caseId },
      data: {
        status,
        completedAt: status === "completed" ? new Date() : undefined,
        updatedById: actorId,
      },
    });
    await tx.caseNote.create({
      data: { caseId, userId: actorId, content: `Status changed to ${status}.`, isInternal: true },
    });
    await syncScheduleFromCase(tx, caseId);
  });
}

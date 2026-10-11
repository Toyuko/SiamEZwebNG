import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { caseServiceName, isAssignableWorker } from "@/lib/jobs/intake";
import {
  assertStaffRange,
  buildStaffEvent,
  jobStaffEvent,
  staffCaseWhere,
  staffManualWhere,
} from "@/lib/calendar/staff-calendar";
import {
  assertStaffPayload,
  publicStaffNames,
  staffEventMatches,
  type StaffCalendarPayload,
} from "@/lib/calendar/staff-calendar-shared";
import type { CalendarFilters } from "@/lib/calendar/schedule";

/** Fields the public calendar is allowed to read from a job. */
export const staffCaseSelect = {
  id: true,
  caseNumber: true,
  scheduledAt: true,
  scheduleTimeTbd: true,
  province: true,
  location: true,
  status: true,
  serviceId: true,
  otherServiceName: true,
  service: { select: { name: true } },
  staffAssignments: {
    orderBy: { assignedAt: "asc" as const },
    take: 1,
    select: { user: { select: { name: true } } },
  },
} satisfies Prisma.CaseSelect;

export const staffManualSelect = {
  id: true,
  title: true,
  start: true,
  end: true,
  allDay: true,
  location: true,
  province: true,
  serviceId: true,
  otherServiceName: true,
  service: { select: { name: true } },
  staff: { select: { name: true } },
} satisfies Prisma.EventSelect;

const TAKE = 400;

export async function loadStaffCalendar(input: {
  start: Date;
  end: Date;
  filters: CalendarFilters;
}): Promise<StaffCalendarPayload> {
  assertStaffRange(input.start, input.end);
  const caseWhere = staffCaseWhere(input.start, input.end, input.filters);
  const eventWhere = staffManualWhere(input.start, input.end, input.filters);
  const [rows, manuals, services, people] = await Promise.all([
    prisma.case.findMany({
      where: caseWhere,
      select: staffCaseSelect,
      orderBy: { scheduledAt: "asc" },
      take: TAKE,
    }),
    prisma.event.findMany({
      where: eventWhere,
      select: staffManualSelect,
      orderBy: { start: "asc" },
      take: 200,
    }),
    prisma.service.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      where: { role: { in: ["admin", "staff", "freelancer"] }, active: true },
      select: { name: true, email: true, role: true, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const events = [
    ...rows.flatMap((row) => {
      if (!row.scheduledAt) return [];
      const event = jobStaffEvent({
        sourceId: row.id,
        caseNumber: row.caseNumber,
        start: row.scheduledAt,
        allDay: row.scheduleTimeTbd,
        serviceName: caseServiceName(row),
        province: row.province,
        location: row.location,
        staffName: row.staffAssignments[0]?.user?.name ?? null,
        status: row.status,
      });
      return staffEventMatches(event, input.filters, row.serviceId) ? [event] : [];
    }),
    ...manuals.flatMap((event) => {
      const sealed = buildStaffEvent({
        sourceId: event.id,
        caseNumber: null,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        serviceName: event.service?.name ?? event.otherServiceName ?? event.title,
        province: event.province,
        location: event.location,
        staffName: event.staff?.name ?? null,
        status: "scheduled",
      });
      return staffEventMatches(sealed, input.filters, event.serviceId) ? [sealed] : [];
    }),
  ].sort((a, b) => a.start.localeCompare(b.start) || a.service.localeCompare(b.service));

  const payload: StaffCalendarPayload = {
    events,
    services,
    staff: publicStaffNames(people.filter((person) => isAssignableWorker(person))),
    fetchedAt: new Date().toISOString(),
    truncated: rows.length >= TAKE,
  };
  assertStaffPayload(payload);
  return payload;
}

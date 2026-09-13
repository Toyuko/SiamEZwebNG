import {
  adminGetFollowUpStats,
  adminGetFollowUpsForCalendar,
  adminListFollowUps,
  adminListFollowUpTemplates,
} from "@/actions/follow-ups";
import {
  getClientsForPicker,
  getServices,
  getStaffUsers,
} from "@/actions/admin";
import {
  daysInMonth,
  formatDateOnly,
  todayInBangkok,
} from "@/lib/follow-ups/dates";
import type {
  FollowUpPriority,
  FollowUpReminderStatus,
  FollowUpStatus,
  FollowUpType,
} from "@prisma/client";
import { FollowUpsDashboard } from "./FollowUpsDashboard";
import { serializeFollowUp } from "./types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminFollowUpsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const search = one(sp.search);
  const serviceId = one(sp.serviceId) ?? one(sp.service);
  const followUpType = one(sp.type) ?? one(sp.followUpType);
  const status = one(sp.status);
  const priority = one(sp.priority);
  const assignedStaffId = one(sp.assignedStaff) ?? one(sp.assignedStaffId);
  const reminderStatus = one(sp.reminder) ?? one(sp.reminderStatus);
  const dueFrom = one(sp.dueFrom);
  const dueTo = one(sp.dueTo);
  const bucket = one(sp.bucket);
  const view = one(sp.view);
  const page = Number(one(sp.page) ?? "1") || 1;

  const today = todayInBangkok();
  const calendarFrom = formatDateOnly({
    year: today.year,
    month: today.month,
    day: 1,
  });
  const calendarTo = formatDateOnly({
    year: today.year,
    month: today.month,
    day: daysInMonth(today.year, today.month),
  });

  const [stats, list, services, staff, clients, templates, calendarRows] =
    await Promise.all([
      adminGetFollowUpStats(),
      adminListFollowUps({
        search,
        serviceId,
        followUpType: (followUpType as FollowUpType | "all" | undefined) ?? "all",
        status: (status as FollowUpStatus | "all" | undefined) ?? "all",
        priority: (priority as FollowUpPriority | "all" | undefined) ?? "all",
        assignedStaffId:
          (assignedStaffId as "me" | "all" | "unassigned" | string | undefined) ??
          "all",
        reminderStatus:
          (reminderStatus as FollowUpReminderStatus | "all" | undefined) ?? "all",
        dueFrom,
        dueTo,
        bucket: (bucket as
          | "due_today"
          | "overdue"
          | "due_week"
          | "due_month"
          | "high_priority"
          | "assigned_to_me"
          | "completed"
          | "upcoming"
          | "all"
          | undefined) ?? "all",
        page,
      }),
      getServices(),
      getStaffUsers(),
      getClientsForPicker(),
      adminListFollowUpTemplates(),
      adminGetFollowUpsForCalendar({ from: calendarFrom, to: calendarTo }),
    ]);

  return (
    <FollowUpsDashboard
      stats={stats}
      items={list.items.map(serializeFollowUp)}
      total={list.total}
      page={list.page}
      totalPages={list.totalPages}
      filters={{
        search,
        serviceId,
        followUpType,
        status,
        priority,
        assignedStaffId,
        reminderStatus,
        dueFrom,
        dueTo,
        bucket,
        view,
        page: String(page),
      }}
      services={services.map((s) => ({ id: s.id, name: s.name, slug: s.slug }))}
      staff={staff}
      clients={clients}
      templates={templates.map((t) => ({
        id: t.id,
        name: t.name,
        active: t.active,
        serviceId: t.serviceId,
      }))}
      calendarItems={calendarRows.map((r) => ({
        id: r.id,
        title: r.title,
        dueDate:
          r.dueDate instanceof Date
            ? r.dueDate.toISOString().slice(0, 10)
            : String(r.dueDate).slice(0, 10),
        status: r.status,
        priority: r.priority,
        client: r.client,
        service: r.service,
      }))}
      calendarYear={today.year}
      calendarMonth={today.month}
    />
  );
}

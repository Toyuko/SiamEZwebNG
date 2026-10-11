import { cookies } from "next/headers";
import { loadStaffCalendar } from "@/data-access/staff-calendar";
import { calendarAnchor, calendarRange, resolveCalendarView, type CalendarContextName } from "@/lib/calendar/schedule";
import { normalizeStaffView } from "@/lib/calendar/staff-calendar";
import { staffFiltersFromParams } from "@/lib/calendar/staff-calendar-shared";
import { StaffCalendar } from "./StaffCalendar";

export const dynamic = "force-dynamic";

export default async function StaffCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const jar = await cookies();
  const context: CalendarContextName = jar.get("siamez-cal-context")?.value === "wide" ? "wide" : "narrow";
  const view = normalizeStaffView(
    resolveCalendarView({
      requested: params.view,
      widePreference: jar.get("siamez-staff-cal-wide")?.value,
      narrowPreference: jar.get("siamez-staff-cal-narrow")?.value,
      context,
    })
  );
  const anchor = calendarAnchor(params.date);
  const range = calendarRange(view, anchor);
  const filters = staffFiltersFromParams({
    provinces: params.provinces,
    staff: params.staff,
    service: params.service,
    status: params.status,
    q: params.q,
  });
  const payload = await loadStaffCalendar({ start: range.start, end: range.end, filters });

  return (
    <StaffCalendar
      payload={payload}
      view={view}
      anchor={anchor}
      filters={filters}
      explicitView={Boolean(params.view)}
    />
  );
}

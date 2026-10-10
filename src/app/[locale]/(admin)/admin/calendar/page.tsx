import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { isAssignableJobStaff } from "@/lib/jobs/intake";
import { loadCalendarLookups, loadCompanyCalendar } from "@/data-access/company-calendar";
import { calendarAnchor, calendarRange, parseProvinceParam, resolveCalendarView, type CalendarContextName, type CalendarFilters } from "@/lib/calendar/schedule";
import { CompanyCalendar } from "./CompanyCalendar";

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const jar = await cookies();
  const context: CalendarContextName = jar.get("siamez-cal-context")?.value === "narrow" ? "narrow" : "wide";
  const view = resolveCalendarView({
    requested: params.view,
    widePreference: jar.get("siamez-cal-wide")?.value ?? jar.get("siamez-calendar-view")?.value,
    narrowPreference: jar.get("siamez-cal-narrow")?.value,
    context,
  });
  const anchor = calendarAnchor(params.date);
  const range = calendarRange(view, anchor);
  const filters: CalendarFilters = {
    provinces: parseProvinceParam(params.provinces),
    staffId: params.staff ?? "",
    serviceId: params.service ?? "",
    status: !params.status || params.status === "cancelled" ? "all" : params.status,
    q: params.q ?? "",
  };
  // Province is applied in the browser from this date range, so switching province
  // does not run another query. Search still asks the database, because it looks
  // outside the visible dates.
  const searching = filters.q.trim().length >= 2;
  const session = await getSession();
  const [calendar, lookups] = await Promise.all([
    loadCompanyCalendar({
      start: range.start,
      end: range.end,
      filters: searching ? filters : { ...filters, provinces: [] },
      includeHealth: false,
    }),
    loadCalendarLookups(),
  ]);

  return (
    <CompanyCalendar
      jobs={calendar.jobs}
      unscheduled={calendar.unscheduled}
      events={calendar.events}
      health={null}
      staff={lookups.staff.filter((person) => isAssignableJobStaff(person))}
      services={lookups.services}
      view={view}
      anchor={anchor}
      filters={filters}
      canRepair={session?.user.role === "admin"}
      truncated={calendar.truncated}
      currentUserId={session?.user.id ?? null}
      explicitView={Boolean(params.view)}
    />
  );
}

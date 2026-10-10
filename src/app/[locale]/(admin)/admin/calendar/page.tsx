import { cookies } from "next/headers";
import { getServices, getStaffUsers } from "@/actions/admin";
import { getSession } from "@/lib/auth";
import { isAssignableJobStaff } from "@/lib/jobs/intake";
import { loadCompanyCalendar } from "@/data-access/company-calendar";
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
    status: params.status ?? "all",
    q: params.q ?? "",
  };
  const session = await getSession();
  const [calendar, staff, services] = await Promise.all([
    loadCompanyCalendar({
      start: range.start,
      end: range.end,
      filters,
      includeHealth: session?.user.role === "admin",
    }),
    getStaffUsers(),
    getServices(),
  ]);

  return (
    <CompanyCalendar
      jobs={calendar.jobs}
      unscheduled={calendar.unscheduled}
      events={calendar.events}
      summary={calendar.summary}
      health={calendar.health}
      staff={staff.filter((person) => isAssignableJobStaff(person))}
      services={services.filter((service) => service.active).map((service) => ({ id: service.id, name: service.name }))}
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

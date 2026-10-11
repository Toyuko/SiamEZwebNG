import { NextResponse } from "next/server";
import { loadStaffCalendar } from "@/data-access/staff-calendar";
import { calendarAnchor, calendarRange, resolveCalendarView, type CalendarContextName } from "@/lib/calendar/schedule";
import { normalizeStaffView } from "@/lib/calendar/staff-calendar";
import { staffFiltersFromParams } from "@/lib/calendar/staff-calendar-shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

function contextFrom(request: Request): CalendarContextName {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|; )siamez-cal-context=([^;]*)/);
  return match?.[1] === "wide" ? "wide" : "narrow";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const context = contextFrom(request);
  const view = normalizeStaffView(
    resolveCalendarView({
      requested: params.get("view") ?? undefined,
      widePreference: undefined,
      narrowPreference: undefined,
      context,
    })
  );
  const anchor = calendarAnchor(params.get("date") ?? undefined);
  const range = calendarRange(view, anchor);
  const filters = staffFiltersFromParams({
    provinces: params.get("provinces") ?? undefined,
    staff: params.get("staff") ?? undefined,
    service: params.get("service") ?? undefined,
    status: params.get("status") ?? undefined,
    q: params.get("q") ?? undefined,
  });
  try {
    const payload = await loadStaffCalendar({ start: range.start, end: range.end, filters });
    return NextResponse.json(payload, { headers: PRIVATE_HEADERS });
  } catch (error) {
    const invalid = error instanceof Error && error.message === "Invalid calendar range";
    if (!invalid) console.error("public calendar failed");
    return NextResponse.json(
      { error: invalid ? "Invalid date range" : "Unable to load the calendar" },
      { status: invalid ? 400 : 500, headers: PRIVATE_HEADERS }
    );
  }
}

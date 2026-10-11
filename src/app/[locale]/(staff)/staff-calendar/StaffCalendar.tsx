"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Filter, RefreshCw, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { CASE_STATUS_LABELS } from "@/lib/domain/case-status";
import type { CaseStatus } from "@prisma/client";
import { provinceOptions, provinceStyle } from "@/lib/calendar/provinces";
import {
  CALENDAR_END_HOUR,
  CALENDAR_START_HOUR,
  agendaDates,
  bangkokClockMinutes,
  calendarContext,
  monthGridDates,
  parseCalendarView,
  preferredCalendarView,
  shiftAnchor,
  weekDates,
  type CalendarFilters,
  type CalendarViewName,
} from "@/lib/calendar/schedule";
import { bangkokDateInputValue, bangkokTimeInputValue } from "@/lib/jobs/intake";
import {
  staffCalendarHref,
  type StaffCalendarEvent,
  type StaffCalendarPayload,
} from "@/lib/calendar/staff-calendar-shared";

const VIEWS: Array<Exclude<CalendarViewName, "threeday">> = ["day", "week", "month", "agenda"];
const HOURS = Array.from({ length: CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1 }, (_, index) => CALENDAR_START_HOUR + index);
const HOUR_PX = 52;
const CACHE_KEY = "siamez-staff-calendar-v1";

type Props = {
  payload: StaffCalendarPayload;
  view: Exclude<CalendarViewName, "threeday">;
  anchor: string;
  filters: CalendarFilters;
  explicitView: boolean;
};

function rememberView(nextView: CalendarViewName) {
  const context = calendarContext(window.innerWidth);
  const key = context === "narrow" ? "siamez-staff-cal-narrow" : "siamez-staff-cal-wide";
  const view = nextView === "threeday" ? "week" : nextView;
  document.cookie = `${key}=${view}; Path=/; Max-Age=31536000; SameSite=Lax`;
  document.cookie = `siamez-cal-context=${context}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function readView(context: "wide" | "narrow") {
  const key = context === "narrow" ? "siamez-staff-cal-narrow" : "siamez-staff-cal-wide";
  const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function eventDate(event: StaffCalendarEvent) {
  return bangkokDateInputValue(new Date(event.start));
}

function clock(event: StaffCalendarEvent) {
  if (event.allDay) return "TBD";
  return bangkokTimeInputValue(new Date(event.start));
}

function statusLabel(status: string) {
  if (status === "scheduled") return "Scheduled";
  if (status in CASE_STATUS_LABELS) return CASE_STATUS_LABELS[status as CaseStatus].en;
  return "Scheduled";
}

function formatUpdated(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    hour: "numeric",
    minute: "2-digit",
  })
    .format(new Date(iso))
    .replace(/\u202f/g, " ");
}

function longDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00+07:00`));
}

function monthDay(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00+07:00`));
}

function weekday(date: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", weekday: "long" }).format(
    new Date(`${date}T12:00:00+07:00`)
  );
}

function monthTitle(date: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", month: "long", year: "numeric" }).format(
    new Date(`${date}T12:00:00+07:00`)
  );
}

function shortWeekday(date: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", weekday: "short" }).format(
    new Date(`${date}T12:00:00+07:00`)
  );
}

function groupTitle(date: string, today: string) {
  if (date === today) return "Today";
  if (date === shiftAnchor(today, "day", 1)) return "Tomorrow";
  return weekday(date);
}

function viewLabel(view: Exclude<CalendarViewName, "threeday">) {
  if (view === "day") return "Day";
  if (view === "week") return "Week";
  if (view === "month") return "Month";
  return "Agenda";
}

function eventsOn(events: StaffCalendarEvent[], date: string) {
  return events
    .filter((event) => eventDate(event) === date)
    .sort((a, b) => Number(a.allDay) - Number(b.allDay) || a.start.localeCompare(b.start));
}

export function StaffCalendar({ payload, view, anchor, filters, explicitView }: Props) {
  const router = useRouter();
  const [pending, startNav] = useTransition();
  const [live, setLive] = useState<StaffCalendarPayload | null>(null);
  const [offline, setOffline] = useState(false);
  const [sheet, setSheet] = useState<"filters" | "event" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftQ, setDraftQ] = useState(filters.q);
  const [refreshing, setRefreshing] = useState(false);
  const picked = useRef(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const refreshedAt = useRef(0);
  const goRef = useRef<(next: Partial<CalendarFilters & { view: CalendarViewName; date: string }>) => void>(() => {});

  const serverKey = `${view}|${anchor}|${payload.fetchedAt}|${payload.events.length}`;
  const [seenKey, setSeenKey] = useState(serverKey);
  if (seenKey !== serverKey) {
    setSeenKey(serverKey);
    setLive(null);
    setOffline(false);
  }
  const data = live ?? payload;
  const today = bangkokDateInputValue(new Date());
  const week = weekDates(anchor);
  const monthDates = monthGridDates(anchor);
  const agenda = agendaDates(anchor);
  const selected = data.events.find((event) => event.id === selectedId) ?? null;
  const filtersActive = Boolean(filters.provinces.length || filters.staffId || filters.serviceId || (filters.status && filters.status !== "all") || filters.q);

  function href(next: Partial<CalendarFilters & { view: CalendarViewName; date: string }>) {
    return staffCalendarHref({
      date: next.date ?? anchor,
      view: (next.view ?? view) as CalendarViewName,
      provinces: next.provinces ?? filters.provinces,
      staffId: next.staffId ?? filters.staffId,
      serviceId: next.serviceId ?? filters.serviceId,
      status: next.status ?? filters.status,
      q: next.q ?? filters.q,
    });
  }

  function go(next: Partial<CalendarFilters & { view: CalendarViewName; date: string }>) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOffline(true);
      return;
    }
    if (next.view) rememberView(next.view);
    setSheet(null);
    startNav(() => router.replace(href(next), { scroll: false }));
  }
  goRef.current = go;

  async function refresh() {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/public-calendar?${href({}).split("?")[1] ?? ""}`, { cache: "no-store" });
      if (!response.ok) throw new Error("refresh failed");
      const body = (await response.json()) as StaffCalendarPayload;
      if (!body || !Array.isArray(body.events) || typeof body.fetchedAt !== "string") throw new Error("refresh failed");
      setLive(body);
      setOffline(false);
      refreshedAt.current = Date.now();
      localStorage.setItem(CACHE_KEY, JSON.stringify({ events: body.events, fetchedAt: body.fetchedAt }));
    } catch {
      setOffline(true);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ events: data.events, fetchedAt: data.fetchedAt }));
  }, [data.events, data.fetchedAt]);

  useEffect(() => {
    const context = calendarContext(window.innerWidth);
    document.cookie = `siamez-cal-context=${context}; Path=/; Max-Age=31536000; SameSite=Lax`;
    if (explicitView || picked.current) return;
    picked.current = true;
    const desired = parseCalendarView(readView(context), preferredCalendarView(window.innerWidth));
    const next = desired === "threeday" ? "week" : desired;
    if (next !== view) goRef.current({ view: next });
  }, [explicitView, view]);

  useEffect(() => {
    if (draftQ === filters.q) return;
    const timer = window.setTimeout(() => goRef.current({ q: draftQ }), 300);
    return () => window.clearTimeout(timer);
  }, [draftQ, filters.q]);

  useEffect(() => {
    function onOffline() {
      setOffline(true);
    }
    function onOnline() {
      setOffline(false);
      if (Date.now() - refreshedAt.current > 15_000) void refresh();
    }
    function onVisible() {
      if (document.visibilityState === "visible" && Date.now() - refreshedAt.current > 15_000) void refresh();
    }
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // refresh closes over the current range; rebind when the view changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, anchor, filters.staffId, filters.serviceId, filters.status, filters.q, filters.provinces.join(",")]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (event.key === "Escape") {
        setSheet(null);
        setSelectedId(null);
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey || sheet) return;
      if (event.key === "t" || event.key === "T") goRef.current({ date: today });
      else if (event.key === "ArrowLeft") goRef.current({ date: shiftAnchor(anchor, view, -1) });
      else if (event.key === "ArrowRight") goRef.current({ date: shiftAnchor(anchor, view, 1) });
      else if (event.key === "d") goRef.current({ view: "day" });
      else if (event.key === "w") goRef.current({ view: "week" });
      else if (event.key === "m") goRef.current({ view: "month" });
      else if (event.key === "a") goRef.current({ view: "agenda" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [anchor, view, today, sheet]);

  const title = view === "month" ? monthTitle(anchor) : view === "week" ? `${monthDay(week[0])} – ${Number(week[6].slice(-2))}` : view === "agenda" ? monthDay(anchor) : longDate(anchor);
  const legend = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of data.events) counts.set(event.province || "Not set", (counts.get(event.province || "Not set") ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [data.events]);

  function openEvent(id: string) {
    setSelectedId(id);
    setSheet("event");
  }

  return (
    <div className="flex h-dvh flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 px-3 pb-2 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 pt-[max(0.5rem,env(safe-area-inset-top))]">
        {(pending || refreshing) && <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-siam-blue" aria-hidden />}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wide text-siam-blue">SIAMEZ</p>
            <h1 className="truncate text-lg font-semibold leading-tight">Calendar</h1>
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Refresh"
            onClick={() => void refresh()}
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
        <p className="mt-1 truncate text-base font-semibold" aria-live="polite">{title}</p>
        <div className="mt-1 flex items-center gap-1">
          <button type="button" className="h-11 shrink-0 rounded-full border border-gray-300 px-3 text-sm font-semibold dark:border-gray-600" onClick={() => go({ date: today })}>
            Today
          </button>
          <button type="button" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Previous" onClick={() => go({ date: shiftAnchor(anchor, view, -1) })}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Next" onClick={() => go({ date: shiftAnchor(anchor, view, 1) })}>
            <ChevronRight className="h-5 w-5" />
          </button>
          <span className="flex-1" />
          <label className="md:hidden">
            <span className="sr-only">Calendar view</span>
            <select
              className="h-11 rounded-full border border-gray-300 bg-white px-2 text-sm font-medium dark:border-gray-600 dark:bg-gray-900"
              aria-label="Calendar view"
              value={view}
              onChange={(event) => go({ view: event.target.value as CalendarViewName })}
            >
              {VIEWS.map((item) => (
                <option key={item} value={item}>{viewLabel(item)}</option>
              ))}
            </select>
          </label>
          <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-gray-100 md:hidden dark:hover:bg-gray-800" aria-label="Filter" onClick={() => setSheet("filters")}>
            <Filter className="h-5 w-5" />
            {filtersActive && <span className="sr-only">Filters active</span>}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">Thailand time · Updated {formatUpdated(data.fetchedAt)}</p>
        <div className="mt-2 hidden items-center gap-1 md:flex" role="tablist" aria-label="Calendar view">
          {VIEWS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={view === item}
              className={`h-11 rounded-full px-4 text-sm ${view === item ? "bg-siam-blue font-semibold text-white" : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"}`}
              onClick={() => go({ view: item })}
            >
              {viewLabel(item)}
            </button>
          ))}
        </div>
        <div className="mt-2 hidden flex-wrap items-center gap-2 md:flex">
          <FilterFields
            filters={filters}
            services={data.services}
            staff={data.staff}
            draftQ={draftQ}
            onQ={setDraftQ}
            onChange={(next) => go(next)}
          />
          {filtersActive && (
            <button type="button" className="h-11 rounded-full px-3 text-sm font-medium text-siam-blue" onClick={() => { setDraftQ(""); go({ provinces: [], staffId: "", serviceId: "", status: "all", q: "" }); }}>
              Clear
            </button>
          )}
        </div>
      </header>

      {offline && (
        <p className="bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100" role="status">
          Offline — showing last updated schedule
        </p>
      )}
      {data.truncated && <p className="px-3 py-2 text-sm text-amber-800">Showing the first jobs in this range.</p>}

      <div
        className="min-h-0 flex-1 overflow-auto pb-[max(1rem,env(safe-area-inset-bottom))]"
        onTouchStart={(event) => {
          const point = event.changedTouches[0];
          touch.current = point ? { x: point.clientX, y: point.clientY } : null;
        }}
        onTouchEnd={(event) => {
          if (!touch.current || view === "month") return;
          const point = event.changedTouches[0];
          if (!point) return;
          const dx = point.clientX - touch.current.x;
          const dy = point.clientY - touch.current.y;
          if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy)) return;
          const step = view === "week" && window.innerWidth >= 768 ? "week" : view === "week" ? "day" : view;
          go({ date: shiftAnchor(anchor, step, dx < 0 ? 1 : -1) });
        }}
      >
        {view === "agenda" && <Agenda events={data.events} dates={agenda} today={today} onOpen={openEvent} />}
        {view === "day" && <DaySchedule date={anchor} events={eventsOn(data.events, anchor)} today={today} onOpen={openEvent} />}
        {view === "week" && (
          <>
            <div className="md:hidden">
              <DayStrip days={week} anchor={anchor} today={today} onPick={(date) => go({ date })} />
              <DaySchedule date={anchor} events={eventsOn(data.events, anchor)} today={today} onOpen={openEvent} />
            </div>
            <div className="hidden md:block">
              <WeekGrid days={week} events={data.events} today={today} onOpen={openEvent} onPick={(date) => go({ view: "day", date })} />
            </div>
          </>
        )}
        {view === "month" && (
          <MonthGrid dates={monthDates} monthKey={anchor.slice(0, 7)} events={data.events} today={today} selected={anchor} onPick={(date) => go({ view: "agenda", date })} />
        )}
        <ProvinceLegend items={legend} />
      </div>

      {sheet === "filters" && (
        <Sheet title="Filter" onClose={() => setSheet(null)}>
          <div className="space-y-3">
            <FilterFields filters={filters} services={data.services} staff={data.staff} draftQ={draftQ} onQ={setDraftQ} onChange={(next) => go(next)} />
            {filtersActive && (
              <button type="button" className="h-11 w-full rounded-xl border text-sm font-medium" onClick={() => { setDraftQ(""); go({ provinces: [], staffId: "", serviceId: "", status: "all", q: "" }); }}>
                Clear filters
              </button>
            )}
          </div>
        </Sheet>
      )}
      {sheet === "event" && selected && (
        <Sheet title={selected.service} onClose={() => { setSheet(null); setSelectedId(null); }}>
          <EventDetail event={selected} />
        </Sheet>
      )}
    </div>
  );
}

function FilterFields({
  filters,
  services,
  staff,
  draftQ,
  onQ,
  onChange,
}: {
  filters: CalendarFilters;
  services: Array<{ id: string; name: string }>;
  staff: string[];
  draftQ: string;
  onQ: (value: string) => void;
  onChange: (next: Partial<CalendarFilters>) => void;
}) {
  return (
    <>
      <input
        value={draftQ}
        onChange={(event) => onQ(event.target.value)}
        placeholder="Search service, province, staff"
        aria-label="Search the schedule"
        className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-base md:max-w-xs dark:border-gray-600 dark:bg-gray-900"
      />
      <Select
        label="Province"
        value={filters.provinces.length === 1 && filters.provinces[0] === "" ? "__needed" : (filters.provinces[0] ?? "")}
        onChange={(province) => onChange({ provinces: province === "__needed" ? [""] : province ? [province] : [] })}
      >
        <option value="">All provinces</option>
        <option value="__needed">Not set</option>
        {provinceOptions().map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </Select>
      <Select label="Staff" value={filters.staffId} onChange={(staffId) => onChange({ staffId })}>
        <option value="">All staff</option>
        <option value="tbd">TBD</option>
        {staff.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </Select>
      <Select label="Service" value={filters.serviceId} onChange={(serviceId) => onChange({ serviceId })}>
        <option value="">All services</option>
        {services.map((service) => (
          <option key={service.id} value={service.id}>{service.name}</option>
        ))}
      </Select>
      <Select label="Status" value={filters.status || "all"} onChange={(status) => onChange({ status })}>
        <option value="all">All statuses</option>
        <option value="confirmed">Confirmed</option>
        <option value="scheduled">Scheduled</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
        <option value="tbd">TBD</option>
      </Select>
    </>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-[10rem] text-sm">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      <select className="h-11 w-full rounded-xl border border-gray-300 bg-white px-2 dark:border-gray-600 dark:bg-gray-900" value={value} aria-label={label} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function Agenda({
  events,
  dates,
  today,
  onOpen,
}: {
  events: StaffCalendarEvent[];
  dates: string[];
  today: string;
  onOpen: (id: string) => void;
}) {
  const groups = dates
    .map((date) => ({ date, events: eventsOn(events, date) }))
    .filter((group) => group.events.length > 0 || group.date === today);
  return (
    <div>
      {groups.map((group) => (
        <section key={group.date} id={group.date === today ? "staff-today" : undefined} className="border-b border-gray-200 px-3 py-3 dark:border-gray-800">
          <h2 className="text-xs font-bold tracking-wide text-gray-500">{groupTitle(group.date, today).toUpperCase()}</h2>
          <p className="text-base font-semibold">{monthDay(group.date)}</p>
          {group.events.length === 0 && <p className="mt-3 text-sm text-gray-500">Nothing scheduled.</p>}
          <ul className="mt-3 space-y-2">
            {group.events.map((event) => (
              <li key={event.id}>
                <EventCard event={event} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {groups.length === 0 && <p className="px-4 py-8 text-sm text-gray-500">Nothing scheduled.</p>}
    </div>
  );
}

function DaySchedule({
  date,
  events,
  today,
  onOpen,
}: {
  date: string;
  events: StaffCalendarEvent[];
  today: string;
  onOpen: (id: string) => void;
}) {
  const allDay = events.filter((event) => event.allDay);
  const timed = events.filter((event) => !event.allDay);
  const now = date === today ? bangkokClockMinutes() : null;
  return (
    <section className="px-3 py-3" aria-label={longDate(date)}>
      <h2 className="text-base font-semibold">{date === today ? "Today · " : ""}{longDate(date)}</h2>
      {allDay.length > 0 && (
        <ul className="mt-3 space-y-2">
          {allDay.map((event) => (
            <li key={event.id}><EventCard event={event} onOpen={onOpen} /></li>
          ))}
        </ul>
      )}
      <ol className="mt-3">
        {HOURS.map((hour) => {
          const hourEvents = timed.filter((event) => Math.floor(bangkokClockMinutes(new Date(event.start)) / 60) === hour);
          const showNow = now != null && Math.floor(now / 60) === hour;
          return (
            <li key={hour} className="grid grid-cols-[3.25rem_1fr] gap-2">
              <p className="pt-2 text-xs font-medium text-gray-500 tabular-nums">{String(hour).padStart(2, "0")}:00</p>
              <div className={`min-h-11 border-t border-gray-200 py-1 dark:border-gray-800 ${showNow ? "border-siam-blue" : ""}`}>
                {showNow && <p className="mb-1 text-xs font-semibold text-siam-blue">Now</p>}
                <ul className="space-y-2">
                  {hourEvents.map((event) => (
                    <li key={event.id}><EventCard event={event} onOpen={onOpen} /></li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
      {events.length === 0 && <p className="mt-4 text-sm text-gray-500">Nothing scheduled.</p>}
    </section>
  );
}

function DayStrip({
  days,
  anchor,
  today,
  onPick,
}: {
  days: string[];
  anchor: string;
  today: string;
  onPick: (date: string) => void;
}) {
  return (
    <div className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-2 py-2 dark:border-gray-800 dark:bg-gray-950">
      {days.map((date) => {
        const selected = date === anchor;
        return (
          <button
            key={date}
            type="button"
            className={`flex h-14 min-w-12 flex-1 flex-col items-center justify-center rounded-xl text-sm ${selected ? "bg-siam-blue font-semibold text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"} ${date === today && !selected ? "text-siam-blue" : ""}`}
            aria-current={selected ? "date" : undefined}
            onClick={() => onPick(date)}
          >
            <span className="text-[11px] uppercase">{shortWeekday(date)}</span>
            <span>{Number(date.slice(-2))}</span>
          </button>
        );
      })}
    </div>
  );
}

function WeekGrid({
  days,
  events,
  today,
  onOpen,
  onPick,
}: {
  days: string[];
  events: StaffCalendarEvent[];
  today: string;
  onOpen: (id: string) => void;
  onPick: (date: string) => void;
}) {
  const now = bangkokClockMinutes();
  return (
    <div className="min-w-0">
      <div className="sticky top-0 z-10 grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div />
        {days.map((date) => (
          <button key={date} type="button" className="h-14 text-center" onClick={() => onPick(date)}>
            <span className="block text-[11px] uppercase text-gray-500">{shortWeekday(date)}</span>
            <span className={`mx-auto mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm ${date === today ? "bg-siam-blue font-semibold text-white" : ""}`}>
              {Number(date.slice(-2))}
            </span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
        <div>
          {HOURS.map((hour) => (
            <div key={hour} className="h-[52px] pr-1 text-right text-[11px] text-gray-500">{String(hour).padStart(2, "0")}:00</div>
          ))}
        </div>
        {days.map((date) => {
          const dayEvents = eventsOn(events, date).filter((event) => !event.allDay);
          const allDay = eventsOn(events, date).filter((event) => event.allDay);
          return (
            <div key={date} className="relative border-l border-gray-100 dark:border-gray-800" style={{ height: HOURS.length * HOUR_PX }}>
              {HOURS.map((hour) => (
                <div key={hour} className="border-t border-gray-100 dark:border-gray-900" style={{ height: HOUR_PX }} />
              ))}
              {date === today && now >= CALENDAR_START_HOUR * 60 && now <= CALENDAR_END_HOUR * 60 && (
                <div className="absolute inset-x-0 z-10 border-t-2 border-siam-blue" style={{ top: ((now - CALENDAR_START_HOUR * 60) / 60) * HOUR_PX }} />
              )}
              {allDay.map((event) => (
                <button key={event.id} type="button" className="absolute inset-x-1 top-0 z-10 truncate rounded px-1 text-left text-[11px] font-semibold" style={chip(event)} onClick={() => onOpen(event.id)}>
                  TBD {event.service}
                </button>
              ))}
              {place(dayEvents).map((item) => {
                const top = ((item.start - CALENDAR_START_HOUR * 60) / 60) * HOUR_PX;
                const height = Math.max(44, ((item.end - item.start) / 60) * HOUR_PX - 2);
                const width = 100 / item.lanes;
                return (
                  <button
                    key={item.event.id}
                    type="button"
                    className="absolute overflow-hidden rounded-md px-1 py-0.5 text-left text-[11px] leading-tight"
                    style={{ ...chip(item.event), top: Math.max(0, top), height, left: `calc(${item.lane * width}% + 2px)`, width: `calc(${width}% - 4px)` }}
                    onClick={() => onOpen(item.event.id)}
                  >
                    <span className="block font-semibold">{clock(item.event)} {item.event.service}</span>
                    <span className="block truncate">{item.event.province || "Not set"} · {item.event.staff}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function place(events: StaffCalendarEvent[]) {
  const items = events.map((event) => {
    const start = bangkokClockMinutes(new Date(event.start));
    const endClock = bangkokClockMinutes(new Date(event.end));
    const end = endClock > start ? endClock : start + 60;
    return { event, start, end };
  });
  const laneEnds: number[] = [];
  const placed = items.map((item) => {
    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else laneEnds[lane] = item.end;
    return { ...item, lane };
  });
  const lanes = Math.max(1, laneEnds.length);
  return placed.map((item) => ({ ...item, lanes }));
}

function MonthGrid({
  dates,
  monthKey,
  events,
  today,
  selected,
  onPick,
}: {
  dates: string[];
  monthKey: string;
  events: StaffCalendarEvent[];
  today: string;
  selected: string;
  onPick: (date: string) => void;
}) {
  const counts = new Map<string, StaffCalendarEvent[]>();
  for (const event of events) {
    const date = eventDate(event);
    counts.set(date, [...(counts.get(date) ?? []), event]);
  }
  return (
    <div className="px-2 py-2">
      <div className="grid grid-cols-7 text-center text-[11px] font-medium uppercase text-gray-500">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
          <div key={day} className="py-2">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dates.map((date) => {
          const dayEvents = counts.get(date) ?? [];
          const outside = !date.startsWith(monthKey);
          return (
            <button
              key={date}
              type="button"
              className={`flex min-h-14 flex-col items-center rounded-lg py-1 ${outside ? "text-gray-400" : ""} ${date === selected ? "bg-gray-100 dark:bg-gray-900" : ""}`}
              onClick={() => onPick(date)}
            >
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm ${date === today ? "bg-siam-blue font-semibold text-white" : ""}`}>
                {Number(date.slice(-2))}
              </span>
              <span className="mt-0.5 flex h-2 gap-0.5" aria-hidden>
                {dayEvents.slice(0, 3).map((event) => (
                  <span key={event.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: provinceStyle(event.province).accent }} />
                ))}
              </span>
              {dayEvents.length > 0 && <span className="sr-only">{dayEvents.length} jobs</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EventCard({ event, onOpen }: { event: StaffCalendarEvent; onOpen: (id: string) => void }) {
  const cancelled = event.status === "cancelled";
  return (
    <button
      type="button"
      className={`flex min-h-11 w-full gap-3 rounded-xl border border-black/5 px-3 py-2.5 text-left ${cancelled ? "opacity-70" : ""}`}
      style={chip(event)}
      onClick={() => onOpen(event.id)}
    >
      <span className="w-12 shrink-0 pt-0.5 text-sm font-semibold tabular-nums">{clock(event)}</span>
      <span className="min-w-0">
        <span className={`block font-semibold ${cancelled ? "line-through" : ""}`}>{event.service}</span>
        <span className="block text-sm">{event.province || "Not set"}</span>
        <span className="block text-sm">{event.staff}</span>
      </span>
    </button>
  );
}

function EventDetail({ event }: { event: StaffCalendarEvent }) {
  const rows = [
    ["Time", clock(event)],
    ["Date", longDate(eventDate(event))],
    ["Province", event.province || "Not set"],
    ["Staff", event.staff],
    ["Status", statusLabel(event.status)],
  ];
  if (event.location) rows.splice(4, 0, ["Location", event.location]);
  if (event.ref) rows.push(["Reference", event.ref]);
  return (
    <dl className="space-y-3">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
          <dd className="text-base">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ProvinceLegend({ items }: { items: Array<[string, number]> }) {
  if (items.length === 0) return null;
  const rows = items.slice(0, 12);
  return (
    <div className="px-3 py-3">
      <div className="hidden flex-wrap gap-x-3 gap-y-1 md:flex" aria-label="Province legend">
        {rows.map(([name]) => (
          <span key={name} className="inline-flex items-center gap-1 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: provinceStyle(name === "Not set" ? null : name).accent }} />
            {name}
          </span>
        ))}
      </div>
      <details className="md:hidden">
        <summary className="flex h-11 cursor-pointer items-center text-sm font-medium">Province legend</summary>
        <ul className="space-y-1 pb-2">
          {rows.map(([name]) => (
            <li key={name} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: provinceStyle(name === "Not set" ? null : name).accent }} />
              {name}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40 md:items-center md:justify-center" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[85vh] w-full overflow-auto rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:bg-gray-950 md:max-w-md md:rounded-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" className="inline-flex h-11 w-11 items-center justify-center" aria-label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function chip(event: StaffCalendarEvent) {
  const style = provinceStyle(event.province);
  return {
    backgroundColor: style.color,
    color: style.textColor,
    boxShadow: `inset 4px 0 0 ${style.accent}`,
  };
}

"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Filter, Menu, Plus, Search, X } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { formatThb } from "@/lib/jobs/intake";
import { provinceOptions, provinceStyle } from "@/lib/calendar/provinces";
import {
  CALENDAR_END_HOUR,
  CALENDAR_START_HOUR,
  agendaDates,
  bangkokClockMinutes,
  calendarContext,
  jobsOnDate,
  monthGridDates,
  parseCalendarView,
  preferredCalendarView,
  shiftAnchor,
  threeDayDates,
  weekDates,
  type CalendarFilters,
  type CalendarJobRecord,
  type CalendarViewName,
  type ScheduleWarning,
} from "@/lib/calendar/schedule";
import {
  assignCalendarProvinceAction,
  assignCalendarStaffAction,
  rescheduleJobAction,
  setCalendarJobStatusAction,
  syncCalendarAction,
} from "@/actions/company-calendar";

type OtherEvent = { id: string; title: string; start: string; end: string; allDay: boolean };
type StaffOption = { id: string; name: string | null; email: string };
type ServiceOption = { id: string; name: string };
type Health = { scheduled: number; linked: number; missing: number; duplicates: number; unscheduled: number } | null;
type Summary = {
  jobs: number;
  dealValueSatang: number;
  depositSatang: number;
  outstandingSatang: number;
  provinces: Array<{ name: string; count: number; color: string; textColor: string; accent: string }>;
};

const DESKTOP_VIEWS: CalendarViewName[] = ["day", "week", "month", "agenda"];
const MOBILE_VIEWS: CalendarViewName[] = ["day", "threeday", "week", "month", "agenda"];
const HOURS = Array.from({ length: CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1 }, (_, index) => CALENDAR_START_HOUR + index);
const HOUR_PX = 64;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function clockLabel(iso: string, allDay: boolean) {
  if (allDay) return "Time TBD";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(new Date(iso))
    .replace(/\u202f/g, " ");
}

function bangkokMinutes(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function bangkokHour(iso: string) {
  return Math.floor(bangkokMinutes(iso) / 60);
}

function jobDate(job: CalendarJobRecord) {
  if (!job.start) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(job.start));
}

function dayHeading(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00+07:00`));
}

function weekRangeTitle(start: string, end: string) {
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  if (sameMonth) {
    const label = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", month: "long", year: "numeric" }).format(new Date(`${start}T12:00:00+07:00`));
    const [monthName, year] = label.split(" ");
    return `${monthName} ${Number(start.slice(-2))}–${Number(end.slice(-2))}, ${year}`;
  }
  return `${shortMonthDay(start)} – ${shortMonthDay(end)}, ${end.slice(0, 4)}`;
}

function monthTitle(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00+07:00`));
}

function shortMonthDay(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00+07:00`));
}

function hourLabel(hour: number) {
  const suffix = hour < 12 ? "AM" : "PM";
  const value = hour % 12 || 12;
  return `${value} ${suffix}`;
}

function timeValue(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function createHref(date: string, time: string) {
  return `/admin/jobs/new?date=${date}&time=${time}`;
}

function rememberCalendarView(nextView: CalendarViewName) {
  const context = calendarContext(window.innerWidth);
  const key = context === "narrow" ? "siamez-cal-narrow" : "siamez-cal-wide";
  document.cookie = `${key}=${nextView}; Path=/; Max-Age=31536000; SameSite=Lax`;
  document.cookie = `siamez-cal-context=${context}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function readCalendarPreference(context: "wide" | "narrow") {
  const key = context === "narrow" ? "siamez-cal-narrow" : "siamez-cal-wide";
  const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function viewLabel(view: CalendarViewName) {
  if (view === "threeday") return "3-day";
  return view.charAt(0).toUpperCase() + view.slice(1);
}

function staffLabel(person: StaffOption) {
  return person.name || person.email;
}

function waHref(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `66${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

function eventLabel(job: CalendarJobRecord) {
  const when = job.start ? clockLabel(job.start, job.allDay) : "Unscheduled";
  return `${when}, ${job.customerName}, ${job.serviceName}, ${job.province ?? "Province needed"}, ${job.staffName}${job.status === "cancelled" ? ", Cancelled" : ""}`;
}

function placeEvents(jobs: CalendarJobRecord[]) {
  const timed = jobs.filter((job) => {
    if (!job.start || job.allDay) return false;
    const hour = bangkokHour(job.start);
    return hour >= CALENDAR_START_HOUR && hour <= CALENDAR_END_HOUR;
  });
  const sorted = [...timed].sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
  const laneEnds: number[] = [];
  const placed = sorted.map((job) => {
    const start = bangkokMinutes(job.start!);
    const end = start + 60;
    let lane = laneEnds.findIndex((until) => until <= start);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    return { job, start, lane };
  });
  const lanes = Math.max(laneEnds.length, 1);
  return placed.map((item) => ({ ...item, lanes }));
}

export function CompanyCalendar({
  jobs,
  unscheduled,
  otherEvents,
  summary,
  health,
  staff,
  services,
  view,
  anchor,
  filters,
  canRepair,
  truncated,
  currentUserId,
  explicitView,
}: {
  jobs: CalendarJobRecord[];
  unscheduled: CalendarJobRecord[];
  otherEvents: OtherEvent[];
  summary: Summary;
  health: Health;
  staff: StaffOption[];
  services: ServiceOption[];
  view: CalendarViewName;
  anchor: string;
  filters: CalendarFilters;
  canRepair: boolean;
  truncated: boolean;
  currentUserId: string | null;
  explicitView: boolean;
}) {
  const router = useRouter();
  const scroller = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const pickedView = useRef(false);
  const goRef = useRef<(next: Partial<CalendarFilters & { view: CalendarViewName; date: string }>) => void>(() => {});
  const [navPending, startNav] = useTransition();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [move, setMove] = useState<{ caseId: string; date: string; time: string; label: string } | null>(null);
  const [warnings, setWarnings] = useState<ScheduleWarning[] | null>(null);
  const [warningMove, setWarningMove] = useState<{ caseId: string; date: string; time: string; timeTbd: boolean } | null>(null);
  const [nowMinutes, setNowMinutes] = useState(() => bangkokClockMinutes());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [panel, setPanel] = useState<"sidebar" | "filters" | null>(null);
  const [searchOpen, setSearchOpen] = useState(Boolean(filters.q));
  const [draftQ, setDraftQ] = useState(filters.q);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(`${anchor.slice(0, 7)}-01`);
  const [miniMonth, setMiniMonth] = useState(`${anchor.slice(0, 7)}-01`);

  const selected = useMemo(
    () => [...jobs, ...unscheduled].find((job) => job.caseId === selectedId) ?? null,
    [jobs, unscheduled, selectedId]
  );
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const week = weekDates(anchor);
  const monthDates = monthGridDates(anchor);
  const threeDays = threeDayDates(anchor);
  const agenda = agendaDates(anchor);
  const jobDates = useMemo(() => new Set(jobs.map(jobDate).filter(Boolean)), [jobs]);
  const mine = Boolean(currentUserId && staff.some((person) => person.id === currentUserId));
  const filtersActive = Boolean(filters.provinces.length || filters.staffId || filters.serviceId || (filters.status && filters.status !== "all") || filters.q);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMinutes(bangkokClockMinutes()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setMiniMonth(`${anchor.slice(0, 7)}-01`);
  }, [anchor]);

  useEffect(() => {
    setDraftQ(filters.q);
  }, [filters.q]);

  useEffect(() => {
    const context = calendarContext(window.innerWidth);
    document.cookie = `siamez-cal-context=${context}; Path=/; Max-Age=31536000; SameSite=Lax`;
    if (explicitView || pickedView.current) return;
    pickedView.current = true;
    const desired = parseCalendarView(readCalendarPreference(context), preferredCalendarView(window.innerWidth));
    if (desired !== view) goRef.current({ view: desired });
  }, [explicitView, view]);

  useEffect(() => {
    if (!searchOpen || draftQ === filters.q) return;
    const timer = window.setTimeout(() => goRef.current({ q: draftQ }), 300);
    return () => window.clearTimeout(timer);
  }, [draftQ, searchOpen, filters.q]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (event.key === "Escape") {
        setSelectedId(null);
        setWarnings(null);
        setMove(null);
        setPickerOpen(false);
        setSearchOpen(false);
        setPanel(null);
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey || selectedId || move || warnings) return;
      if (event.key === "t" || event.key === "T") {
        event.preventDefault();
        goRef.current({ date: today });
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goRef.current({ date: shiftAnchor(anchor, view, -1) });
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goRef.current({ date: shiftAnchor(anchor, view, 1) });
      } else if (event.key === "d") goRef.current({ view: "day" });
      else if (event.key === "w") goRef.current({ view: "week" });
      else if (event.key === "m") goRef.current({ view: "month" });
      else if (event.key === "a") goRef.current({ view: "agenda" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [anchor, view, today, selectedId, move, warnings]);

  function buildHref(next: Partial<CalendarFilters & { view: CalendarViewName; date: string }>) {
    const params = new URLSearchParams();
    params.set("date", next.date ?? anchor);
    params.set("view", next.view ?? view);
    const provinces = next.provinces ?? filters.provinces;
    if (provinces.length) params.set("provinces", provinces.join(","));
    const staffId = next.staffId ?? filters.staffId;
    const serviceId = next.serviceId ?? filters.serviceId;
    const status = next.status ?? filters.status;
    const q = next.q ?? filters.q;
    if (staffId) params.set("staff", staffId);
    if (serviceId) params.set("service", serviceId);
    if (status && status !== "all") params.set("status", status);
    if (q) params.set("q", q);
    return `/admin/calendar?${params.toString()}`;
  }

  function go(next: Parameters<typeof buildHref>[0]) {
    if (next.view) rememberCalendarView(next.view);
    startNav(() => router.push(buildHref(next)));
  }

  function goToday() {
    if (anchor === today) {
      scroller.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    go({ date: today });
  }
  goRef.current = go;

  function toggleProvince(name: string) {
    if (name === "__needed") {
      go({ provinces: filters.provinces.length === 1 && filters.provinces[0] === "" ? [] : [""] });
      return;
    }
    const provinces = filters.provinces.includes(name)
      ? filters.provinces.filter((item) => item !== name)
      : [...filters.provinces, name];
    go({ provinces });
  }

  function run(action: () => Promise<{ ok: boolean; error?: string; confirm?: ScheduleWarning[]; report?: { scanned: number; already: number; added: number; unscheduled: number; errors: number } }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok && result.confirm?.length) {
        setWarnings(result.confirm);
        return;
      }
      if (!result.ok) {
        setError(result.error ?? "Unable to reschedule job.");
        setMove(null);
        return;
      }
      if (result.report) {
        const item = result.report;
        setReport(`Jobs scanned: ${item.scanned}. Already scheduled: ${item.already}. Added to calendar: ${item.added}. Unscheduled: ${item.unscheduled}. Errors: ${item.errors}.`);
      }
      setWarnings(null);
      setWarningMove(null);
      setMove(null);
      router.refresh();
    });
  }

  function requestReschedule(caseId: string, date: string, time: string, timeTbd: boolean) {
    setWarningMove({ caseId, date, time, timeTbd });
    run(() => rescheduleJobAction(caseId, { date, time: timeTbd ? null : time, timeTbd }));
  }

  function openSearchResult(job: CalendarJobRecord) {
    const date = jobDate(job) || anchor;
    setSelectedId(job.caseId);
    setSearchOpen(false);
    setDraftQ("");
    go({ date, q: "", view: view === "month" ? "day" : view });
  }

  const title = view === "month"
    ? monthTitle(anchor)
    : view === "week"
      ? weekRangeTitle(week[0], week[6])
      : view === "threeday"
        ? `${shortMonthDay(threeDays[0])} – ${shortMonthDay(threeDays[2])}`
        : view === "agenda"
          ? `${shortMonthDay(agenda[0])} – ${shortMonthDay(agenda[agenda.length - 1])}`
          : dayHeading(anchor);
  const compactTitle = view === "month"
    ? monthTitle(anchor)
    : view === "week"
      ? `${shortMonthDay(week[0])} – ${Number(week[6].slice(-2))}`
      : view === "day" || view === "agenda"
        ? shortMonthDay(anchor)
        : `${shortMonthDay(threeDays[0])} – ${Number(threeDays[2].slice(-2))}`;

  const gridDays = view === "week" ? week : view === "threeday" ? threeDays : [anchor];

  return (
    <>
      <div className="print:hidden -mx-4 -my-4 flex h-[calc(100dvh-3.5rem)] flex-col bg-white text-gray-900 md:-mx-6 md:-my-6 dark:bg-gray-950 dark:text-gray-100">
        {navPending && <div className="h-0.5 shrink-0 animate-pulse bg-siam-blue" aria-hidden />}
        <header className="flex shrink-0 flex-col gap-2 border-b border-gray-200 px-2 py-2 dark:border-gray-800 sm:px-3 lg:flex-row lg:items-center">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Calendar sidebar"
            onClick={() => {
              if (window.innerWidth >= 1024) setSidebarOpen((open) => !open);
              else setPanel("sidebar");
            }}
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            className={`h-10 rounded-full border px-4 text-sm font-medium ${anchor === today ? "border-gray-200 text-gray-400 dark:border-gray-700" : "border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-900"}`}
            onClick={goToday}
          >
            Today
          </button>
          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Previous" onClick={() => go({ date: shiftAnchor(anchor, view, -1) })}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Next" onClick={() => go({ date: shiftAnchor(anchor, view, 1) })}>
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="relative min-w-0">
            <button
              type="button"
              className="truncate px-1 text-left text-lg font-medium sm:text-xl"
              aria-expanded={pickerOpen}
              aria-label={`Jump to a date, ${title}`}
              onClick={() => {
                setPickerMonth(`${anchor.slice(0, 7)}-01`);
                setPickerOpen((open) => !open);
              }}
            >
              <span className="lg:hidden">{compactTitle}</span>
              <span className="hidden lg:inline">{title}</span>
            </button>
            {pickerOpen && (
              <div className="absolute left-0 top-11 z-30 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                <MiniMonth
                  monthAnchor={pickerMonth}
                  selected={anchor}
                  today={today}
                  jobDates={jobDates}
                  onPrev={() => setPickerMonth(shiftAnchor(pickerMonth, "month", -1))}
                  onNext={() => setPickerMonth(shiftAnchor(pickerMonth, "month", 1))}
                  onPick={(date) => {
                    setPickerOpen(false);
                    go({ date });
                  }}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 lg:ml-auto">
            <div className="hidden rounded-lg bg-gray-100 p-0.5 lg:flex dark:bg-gray-900" role="tablist" aria-label="Calendar view">
              {DESKTOP_VIEWS.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={view === item}
                  className={`h-9 rounded-md px-3 text-sm ${view === item ? "bg-white font-semibold text-siam-blue shadow-sm dark:bg-gray-800" : "text-gray-600 dark:text-gray-300"}`}
                  onClick={() => go({ view: item })}
                >
                  {viewLabel(item)}
                </button>
              ))}
              {view === "threeday" && (
                <button type="button" role="tab" aria-selected className="h-9 rounded-md bg-white px-3 text-sm font-semibold text-siam-blue shadow-sm dark:bg-gray-800">
                  3-day
                </button>
              )}
            </div>
            <label className="lg:hidden">
              <span className="sr-only">Calendar view</span>
              <select
                className="h-10 rounded-lg border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                value={view}
                aria-label="Calendar view"
                onChange={(event) => go({ view: event.target.value as CalendarViewName })}
              >
                {MOBILE_VIEWS.map((item) => (
                  <option key={item} value={item}>{viewLabel(item)}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 lg:hidden dark:hover:bg-gray-800"
              aria-label="Filters"
              onClick={() => setPanel("filters")}
            >
              <Filter className="h-5 w-5" />
            </button>
            <button
              type="button"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 ${searchOpen ? "bg-gray-100 dark:bg-gray-800" : ""}`}
              aria-label="Search jobs"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((open) => !open)}
            >
              <Search className="h-5 w-5" />
            </button>
            <Link href={createHref(anchor, "09:00")} className="hidden h-10 items-center gap-1 rounded-full bg-siam-blue px-4 text-sm font-semibold text-white lg:inline-flex">
              <Plus className="h-4 w-4" />
              Create
            </Link>
          </div>
        </header>

        <div className="hidden shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 px-3 py-2 lg:flex dark:border-gray-800">
          <FilterSelect label="Staff" value={filters.staffId} onChange={(staffId) => go({ staffId })}>
            <option value="">All staff</option>
            <option value="tbd">TBD</option>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>{staffLabel(person)}</option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Province"
            value={filters.provinces.length === 1 ? filters.provinces[0] : ""}
            onChange={(province) => go({ provinces: province ? [province] : [] })}
          >
            <option value="">{filters.provinces.length > 1 ? `${filters.provinces.length} provinces` : "All provinces"}</option>
            {provinceOptions().map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="Service" value={filters.serviceId} onChange={(serviceId) => go({ serviceId })}>
            <option value="">All services</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="Status" value={filters.status || "all"} onChange={(status) => go({ status })}>
            <option value="all">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="tbd">TBD</option>
          </FilterSelect>
          {filtersActive && (
            <button type="button" className="h-10 rounded-full px-3 text-sm font-medium text-siam-blue" onClick={() => go({ provinces: [], staffId: "", serviceId: "", status: "all", q: "" })}>
              Clear filters
            </button>
          )}
        </div>

        {searchOpen && (
          <div className="shrink-0 border-b border-gray-200 px-3 py-2 dark:border-gray-800">
            <input
              autoFocus
              value={draftQ}
              onChange={(event) => setDraftQ(event.target.value)}
              placeholder="Search jobs…"
              aria-label="Search jobs"
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base dark:border-gray-600 dark:bg-gray-900"
            />
            {draftQ.trim().length >= 2 && (
              <ul className="mt-2 max-h-64 overflow-auto" aria-label="Search results">
                {jobs.length === 0 && <li className="py-2 text-sm text-gray-500">No matching jobs.</li>}
                {jobs.slice(0, 8).map((job) => (
                  <li key={job.caseId}>
                    <button type="button" className="flex w-full flex-col rounded-lg px-2 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-900" onClick={() => openSearchResult(job)}>
                      <span className="font-medium">{job.customerName}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {jobDate(job) ? `${dayHeading(jobDate(job))} · ${job.start ? clockLabel(job.start, job.allDay) : "Unscheduled"}` : "Unscheduled"}
                        {" · "}
                        {job.province ?? "Province needed"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {error && (
          <p className="mx-3 mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200" role="alert">
            {error}
          </p>
        )}
        {truncated && <p className="px-3 py-2 text-sm text-amber-700 dark:text-amber-300">Showing the first matching jobs. Narrow the date or search.</p>}

        <div className="flex min-h-0 flex-1">
          {sidebarOpen && (
            <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-gray-200 p-3 lg:flex dark:border-gray-800">
              <SidebarBody
                miniMonth={miniMonth}
                anchor={anchor}
                today={today}
                jobDates={jobDates}
                staff={staff}
                filters={filters}
                summary={summary}
                unscheduled={unscheduled}
                mine={mine}
                currentUserId={currentUserId}
                canRepair={canRepair}
                health={health}
                report={report}
                pending={pending}
                onMiniMonth={setMiniMonth}
                onPickDate={(date) => go({ date })}
                onStaff={(staffId) => go({ staffId })}
                onProvince={toggleProvince}
                onStatus={(status) => go({ status })}
                onOpenJob={setSelectedId}
                onSync={() => run(() => syncCalendarAction())}
                onPrint={() => window.print()}
              />
            </aside>
          )}

          <div
            ref={scroller}
            className="min-w-0 flex-1 overflow-auto"
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
              const direction = dx < 0 ? 1 : -1;
              const step = view === "week" || view === "threeday" ? "day" : view;
              go({ date: shiftAnchor(anchor, step, direction) });
            }}
          >
            {view === "month" && (
              <MonthGrid
                dates={monthDates}
                monthKey={anchor.slice(0, 7)}
                jobs={jobs}
                today={today}
                selected={anchor}
                onOpenDay={(date) => go({ view: "day", date })}
                onOpenJob={setSelectedId}
              />
            )}
            {(view === "week" || view === "threeday") && (
              <>
                <div className={view === "week" ? "hidden md:block" : "block"}>
                  <TimeGrid
                    days={gridDays}
                    jobs={jobs}
                    today={today}
                    nowMinutes={nowMinutes}
                    onOpen={setSelectedId}
                    onDropRequest={(caseId, date, time) => {
                      setMove({ caseId, date, time, label: `${dayHeading(date)} at ${clockLabel(`${date}T${time}:00+07:00`, false)}` });
                    }}
                  />
                </div>
                {view === "week" && (
                  <div className="md:hidden">
                    <DayStrip days={week} anchor={anchor} today={today} onPick={(date) => go({ date })} />
                    <DaySchedule date={anchor} jobs={jobsOnDate(jobs, anchor)} today={anchor === today} nowMinutes={nowMinutes} onOpen={setSelectedId} />
                  </div>
                )}
              </>
            )}
            {view === "day" && (
              <DaySchedule date={anchor} jobs={jobsOnDate(jobs, anchor)} today={anchor === today} nowMinutes={nowMinutes} onOpen={setSelectedId} detailed />
            )}
            {view === "agenda" && (
              <AgendaList dates={agenda} jobs={jobs} today={today} nowMinutes={nowMinutes} onOpen={setSelectedId} />
            )}
            {otherEvents.length > 0 && (
              <section className="border-t border-gray-200 px-3 py-3 dark:border-gray-800">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Other appointments</h2>
                <ul className="mt-2 space-y-1">
                  {otherEvents.map((event) => (
                    <li key={event.id}>
                      <Link href={`/admin/calendar/${event.id}`} className="block rounded-lg px-2 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-900">
                        {clockLabel(event.start, event.allDay)} · {event.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        <Link
          href={createHref(anchor, "09:00")}
          className="fixed bottom-5 right-5 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-siam-blue text-white shadow-lg lg:hidden"
          aria-label="Create job"
        >
          <Plus className="h-7 w-7" />
        </Link>
      </div>

      <div className="mt-6 hidden print:block" id="calendar-print">
        <h1 className="text-xl font-bold">SiamEZ schedule · {anchor}</h1>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Customer</th>
              <th>Service</th>
              <th>Staff</th>
              <th>Province</th>
              <th>Location</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.caseId}>
                <td>{job.start ? jobDate(job) : "TBD"}</td>
                <td>{job.start ? clockLabel(job.start, job.allDay) : "TBD"}</td>
                <td>{job.customerName}</td>
                <td>{job.serviceName}</td>
                <td>{job.staffName}</td>
                <td>{job.province ?? "Province needed"}</td>
                <td>{job.location ?? "—"}</td>
                <td>{job.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {panel && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40 lg:hidden" role="presentation" onClick={() => setPanel(null)}>
          <div role="dialog" aria-modal="true" aria-label={panel === "filters" ? "Filters" : "Calendar sidebar"} className="max-h-[85vh] w-full overflow-auto rounded-t-2xl bg-white p-4 dark:bg-gray-950" onClick={(event) => event.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{panel === "filters" ? "Filters" : "Calendar"}</h2>
              <button type="button" className="inline-flex h-11 w-11 items-center justify-center" aria-label="Close" onClick={() => setPanel(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {panel === "filters" ? (
              <div className="space-y-3">
                <FilterSelect label="Staff" value={filters.staffId} onChange={(staffId) => go({ staffId })}>
                  <option value="">All staff</option>
                  <option value="tbd">TBD</option>
                  {staff.map((person) => (
                    <option key={person.id} value={person.id}>{staffLabel(person)}</option>
                  ))}
                </FilterSelect>
                <FilterSelect label="Province" value={filters.provinces[0] ?? ""} onChange={(province) => go({ provinces: province ? [province] : [] })}>
                  <option value="">All provinces</option>
                  {provinceOptions().map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </FilterSelect>
                <FilterSelect label="Service" value={filters.serviceId} onChange={(serviceId) => go({ serviceId })}>
                  <option value="">All services</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </FilterSelect>
                <FilterSelect label="Status" value={filters.status || "all"} onChange={(status) => go({ status })}>
                  <option value="all">All statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="tbd">TBD</option>
                </FilterSelect>
                <button type="button" className="h-11 w-full rounded-lg border text-sm font-medium" onClick={() => { go({ provinces: [], staffId: "", serviceId: "", status: "all", q: "" }); setPanel(null); }}>
                  Clear filters
                </button>
              </div>
            ) : (
              <SidebarBody
                miniMonth={miniMonth}
                anchor={anchor}
                today={today}
                jobDates={jobDates}
                staff={staff}
                filters={filters}
                summary={summary}
                unscheduled={unscheduled}
                mine={mine}
                currentUserId={currentUserId}
                canRepair={canRepair}
                health={health}
                report={report}
                pending={pending}
                onMiniMonth={setMiniMonth}
                onPickDate={(date) => { setPanel(null); go({ date }); }}
                onStaff={(staffId) => go({ staffId })}
                onProvince={toggleProvince}
                onStatus={(status) => go({ status })}
                onOpenJob={(id) => { setPanel(null); setSelectedId(id); }}
                onSync={() => run(() => syncCalendarAction())}
                onPrint={() => window.print()}
              />
            )}
          </div>
        </div>
      )}

      {selected && (
        <JobPopover
          job={selected}
          staff={staff}
          pending={pending}
          error={error}
          onClose={() => setSelectedId(null)}
          onReschedule={(date, time, timeTbd) => requestReschedule(selected.caseId, date, time, timeTbd)}
          onStaff={(staffId) => run(() => assignCalendarStaffAction(selected.caseId, staffId))}
          onProvince={(province) => run(() => assignCalendarProvinceAction(selected.caseId, province))}
          onStatus={(status) => run(() => setCalendarJobStatusAction(selected.caseId, status))}
        />
      )}

      {move && (
        <ConfirmDialog
          title={`Reschedule ${jobs.find((job) => job.caseId === move.caseId)?.customerName ?? "this job"}?`}
          body={move.label}
          pending={pending}
          onCancel={() => setMove(null)}
          onConfirm={() => requestReschedule(move.caseId, move.date, move.time, false)}
        />
      )}

      {warnings && warningMove && (
        <ConfirmDialog
          title="Scheduling conflict"
          body={warnings
            .map((warning) =>
              warning.kind === "conflict"
                ? `${warning.staffName} already has a job at ${warning.existingTime}${warning.existingProvince ? ` in ${warning.existingProvince}` : ""} (${warning.existingCustomer}).`
                : `Location/travel warning: ${warning.staffName} has another job in ${warning.otherProvince} at ${warning.otherTime}.`
            )
            .join(" ")}
          confirmLabel="Keep anyway"
          pending={pending}
          onCancel={() => {
            setWarnings(null);
            setWarningMove(null);
          }}
          onConfirm={() =>
            run(() =>
              rescheduleJobAction(warningMove.caseId, {
                date: warningMove.date,
                time: warningMove.timeTbd ? null : warningMove.time,
                timeTbd: warningMove.timeTbd,
                acknowledge: true,
              })
            )
          }
        />
      )}
    </>
  );
}

function FilterSelect({
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
    <label className="block min-w-[9rem] flex-1 text-sm">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-2 text-sm lg:h-10 dark:border-gray-600 dark:bg-gray-900"
      >
        {children}
      </select>
    </label>
  );
}

function MiniMonth({
  monthAnchor,
  selected,
  today,
  jobDates,
  onPrev,
  onNext,
  onPick,
}: {
  monthAnchor: string;
  selected: string;
  today: string;
  jobDates: Set<string>;
  onPrev: () => void;
  onNext: () => void;
  onPick: (date: string) => void;
}) {
  const dates = monthGridDates(monthAnchor);
  const monthKey = monthAnchor.slice(0, 7);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Previous month" onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold">{monthTitle(monthAnchor)}</p>
        <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Next month" onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-gray-500">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">{day.slice(0, 1)}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dates.map((date) => {
          const outside = !date.startsWith(monthKey);
          const isToday = date === today;
          const isSelected = date === selected;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onPick(date)}
              className={`flex h-8 flex-col items-center justify-center rounded-full text-xs ${outside ? "text-gray-400" : ""} ${isSelected && !isToday ? "bg-gray-200 dark:bg-gray-700" : ""}`}
            >
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${isToday ? "bg-siam-blue font-semibold text-white" : ""}`}>
                {Number(date.slice(-2))}
              </span>
              {jobDates.has(date) && <span className="mt-0.5 h-1 w-1 rounded-full bg-siam-blue" aria-hidden />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SidebarBody(props: {
  miniMonth: string;
  anchor: string;
  today: string;
  jobDates: Set<string>;
  staff: StaffOption[];
  filters: CalendarFilters;
  summary: Summary;
  unscheduled: CalendarJobRecord[];
  mine: boolean;
  currentUserId: string | null;
  canRepair: boolean;
  health: Health;
  report: string | null;
  pending: boolean;
  onMiniMonth: (month: string) => void;
  onPickDate: (date: string) => void;
  onStaff: (staffId: string) => void;
  onProvince: (name: string) => void;
  onStatus: (status: string) => void;
  onOpenJob: (id: string) => void;
  onSync: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="space-y-4">
      <MiniMonth
        monthAnchor={props.miniMonth}
        selected={props.anchor}
        today={props.today}
        jobDates={props.jobDates}
        onPrev={() => props.onMiniMonth(shiftAnchor(props.miniMonth, "month", -1))}
        onNext={() => props.onMiniMonth(shiftAnchor(props.miniMonth, "month", 1))}
        onPick={props.onPickDate}
      />
      <div className="space-y-1">
        <button
          type="button"
          aria-pressed={!props.filters.staffId && props.filters.status === "all"}
          className={`flex h-10 w-full items-center rounded-lg px-2 text-left text-sm ${!props.filters.staffId ? "bg-gray-100 font-semibold dark:bg-gray-800" : "hover:bg-gray-50 dark:hover:bg-gray-900"}`}
          onClick={() => props.onStaff("")}
        >
          All jobs
        </button>
        {props.mine && props.currentUserId && (
          <button
            type="button"
            aria-pressed={props.filters.staffId === props.currentUserId}
            className={`flex h-10 w-full items-center rounded-lg px-2 text-left text-sm ${props.filters.staffId === props.currentUserId ? "bg-gray-100 font-semibold dark:bg-gray-800" : "hover:bg-gray-50 dark:hover:bg-gray-900"}`}
            onClick={() => props.onStaff(props.currentUserId!)}
          >
            My jobs
          </button>
        )}
      </div>
      <div>
        <h2 className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Staff</h2>
        <ul className="mt-1">
          <li>
              <button type="button" className={`flex h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm ${props.filters.staffId === "tbd" ? "bg-gray-100 font-semibold dark:bg-gray-800" : "hover:bg-gray-50 dark:hover:bg-gray-900"}`} aria-pressed={props.filters.staffId === "tbd"} onClick={() => props.onStaff(props.filters.staffId === "tbd" ? "" : "tbd")}>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold dark:bg-gray-700">?</span>
              TBD
            </button>
          </li>
          {props.staff.map((person) => (
            <li key={person.id}>
              <button type="button" className={`flex h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm ${props.filters.staffId === person.id ? "bg-gray-100 font-semibold dark:bg-gray-800" : "hover:bg-gray-50 dark:hover:bg-gray-900"}`} aria-pressed={props.filters.staffId === person.id} onClick={() => props.onStaff(props.filters.staffId === person.id ? "" : person.id)}>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold dark:bg-gray-700">{staffLabel(person).slice(0, 1)}</span>
                {staffLabel(person)}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Provinces</h2>
        <ul className="mt-1 max-h-40 overflow-auto">
          {props.summary.provinces.map((item) => (
            <li key={item.name}>
              <button type="button" className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-900" onClick={() => props.onProvince(item.name === "Other" || item.name === "Province needed" ? "__needed" : item.name)}>
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.accent }} />
                {item.name} ({item.count})
              </button>
            </li>
          ))}
        </ul>
        <details className="mt-1">
          <summary className="cursor-pointer px-2 text-sm text-siam-blue">All provinces</summary>
          <ul className="mt-1 max-h-48 overflow-auto">
            {provinceOptions().map((name) => {
              const style = provinceStyle(name);
              const active = props.filters.provinces.includes(name);
              return (
                <li key={name}>
                  <button type="button" aria-pressed={active} className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-900" onClick={() => props.onProvince(name)}>
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: style.accent }} />
                    {name}
                  </button>
                </li>
              );
            })}
          </ul>
        </details>
      </div>
      <div className="flex gap-2">
        <button type="button" className="h-10 flex-1 rounded-lg border text-sm" onClick={() => props.onStatus(props.filters.status === "completed" ? "all" : "completed")}>Completed</button>
        <button type="button" className="h-10 flex-1 rounded-lg border text-sm" onClick={() => props.onStatus(props.filters.status === "cancelled" ? "all" : "cancelled")}>Cancelled</button>
      </div>
      <section>
        <h2 className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Unscheduled — {props.unscheduled.length === 40 ? "40+" : props.unscheduled.length}
        </h2>
        {props.unscheduled.length === 0 ? (
          <p className="px-2 py-2 text-sm text-gray-500">Every confirmed job in this list has a date.</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {props.unscheduled.slice(0, 8).map((job) => (
              <li key={job.caseId} className="rounded-lg px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-900">
                <p className="text-sm font-medium">{job.customerName}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">{job.serviceName} · {job.province ?? "Province needed"}</p>
                <button type="button" className="mt-1 text-sm font-medium text-siam-blue" onClick={() => props.onOpenJob(job.caseId)}>
                  Schedule
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <button type="button" className="h-10 w-full rounded-lg border text-sm" onClick={props.onPrint}>Print schedule</button>
      {props.canRepair && (
        <details>
          <summary className="cursor-pointer text-sm font-medium">Calendar health</summary>
          {props.health && (
            <dl className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
              <div>Scheduled jobs: {props.health.scheduled}</div>
              <div>Calendar events: {props.health.linked}</div>
              <div>Missing calendar events: {props.health.missing}</div>
              <div>Duplicate calendar events: {props.health.duplicates}</div>
              <div>Unscheduled confirmed jobs: {props.health.unscheduled}</div>
            </dl>
          )}
          {props.report && <p className="mt-2 text-xs">{props.report}</p>}
          <button type="button" disabled={props.pending} className="mt-2 h-10 w-full rounded-lg bg-siam-blue text-sm font-semibold text-white disabled:opacity-60" onClick={props.onSync}>
            {props.pending ? "Syncing…" : "Sync existing jobs"}
          </button>
        </details>
      )}
    </div>
  );
}

function AllDayChip({ job }: { job: CalendarJobRecord }) {
  const style = provinceStyle(job.province);
  const cancelled = job.status === "cancelled";
  return (
    <span
      className={`block truncate rounded bg-white px-1 py-0.5 text-left text-[11px] text-gray-900 dark:bg-gray-900 dark:text-gray-100 ${cancelled ? "line-through opacity-60" : ""}`}
      style={{ boxShadow: `inset 3px 0 0 ${style.accent}` }}
    >
      {job.start ? clockLabel(job.start, job.allDay) : "TBD"} {job.customerName}
      <span className="text-gray-500"> · {job.province ?? "Province needed"}</span>
    </span>
  );
}

function EventCard({ job, dense = false }: { job: CalendarJobRecord; dense?: boolean }) {
  const style = provinceStyle(job.province);
  const cancelled = job.status === "cancelled";
  return (
    <span
      className={`block overflow-hidden rounded-md border border-gray-200 bg-white text-left text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${cancelled ? "line-through opacity-60" : ""} ${job.status === "completed" ? "opacity-80" : ""} ${dense ? "px-1.5 py-0.5 text-[11px] leading-tight" : "px-2 py-1.5 text-sm leading-snug"}`}
      style={{ boxShadow: `inset 3px 0 0 ${style.accent}` }}
    >
      <span className="block truncate font-semibold">
        {job.start ? clockLabel(job.start, job.allDay) : "TBD"} {job.customerName}
      </span>
      <span className="block truncate">{job.serviceName}</span>
      <span className="flex items-center gap-1 truncate text-gray-600 dark:text-gray-300">
        <span className="truncate">{job.province ?? "Province needed"}</span>
        <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-100 px-1 text-[10px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200" title={job.staffName}>
          {job.staffName === "TBD" ? "?" : job.staffName.slice(0, 1)}
        </span>
      </span>
    </span>
  );
}

function MonthGrid({
  dates,
  monthKey,
  jobs,
  today,
  selected,
  onOpenDay,
  onOpenJob,
}: {
  dates: string[];
  monthKey: string;
  jobs: CalendarJobRecord[];
  today: string;
  selected: string;
  onOpenDay: (date: string) => void;
  onOpenJob: (id: string) => void;
}) {
  const router = useRouter();
  return (
    <div className="min-w-[20rem]">
      <div className="grid grid-cols-7 border-b border-gray-200 text-center text-xs font-medium text-gray-500 dark:border-gray-800">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dates.map((date) => {
          const dayJobs = jobsOnDate(jobs, date);
          const outside = !date.startsWith(monthKey);
          const shown = dayJobs.slice(0, 2);
          const provinces = [...new Map(dayJobs.map((job) => [job.province ?? "Province needed", provinceStyle(job.province).accent])).entries()];
          return (
            <div
              key={date}
              className={`min-h-24 border-b border-r border-gray-200 p-1 dark:border-gray-800 md:min-h-32 ${date === today ? "bg-sky-50/70 dark:bg-sky-950/30" : ""} ${outside ? "bg-gray-50/80 dark:bg-gray-900/40" : ""}`}
              onClick={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest("[data-event], [data-daynum], [data-more]")) return;
                router.push(createHref(date, "09:00"));
              }}
            >
              <button
                type="button"
                data-daynum
                className="mb-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs"
                onClick={() => onOpenDay(date)}
              >
                <span className={`${date === today ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-siam-blue font-semibold text-white" : ""} ${date === selected && date !== today ? "font-semibold underline" : ""} ${outside ? "text-gray-400" : ""}`}>
                  {Number(date.slice(-2))}
                </span>
              </button>
              {dayJobs.length > 0 && (
                <button type="button" data-more className="block px-0.5 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-200" onClick={() => onOpenDay(date)}>
                  {dayJobs.length} {dayJobs.length === 1 ? "job" : "jobs"}
                </button>
              )}
              {provinces.length > 0 && (
                <div className="mt-0.5 flex gap-1 px-0.5" aria-label={provinces.map(([name]) => name).join(", ")}>
                  {provinces.slice(0, 4).map(([name, accent]) => (
                    <span key={name} className="h-2 w-2 rounded-full" style={{ background: accent }} title={name} />
                  ))}
                </div>
              )}
              <div className="mt-0.5 hidden space-y-0.5 md:block">
                {shown.map((job) => (
                  <button key={job.caseId} type="button" data-event className="block w-full" aria-label={eventLabel(job)} onClick={() => onOpenJob(job.caseId)}>
                    <EventCard job={job} dense />
                  </button>
                ))}
                {dayJobs.length > 2 && (
                  <button type="button" data-more className="px-1 text-left text-[11px] font-medium text-gray-600 dark:text-gray-300" onClick={() => onOpenDay(date)}>
                    + {dayJobs.length - 2} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayStrip({ days, anchor, today, onPick }: { days: string[]; anchor: string; today: string; onPick: (date: string) => void }) {
  return (
    <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
      {days.map((date) => {
        const label = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", weekday: "short" }).format(new Date(`${date}T12:00:00+07:00`));
        return (
          <button key={date} type="button" className="flex flex-col items-center py-2" onClick={() => onPick(date)} aria-current={date === anchor ? "date" : undefined}>
            <span className="text-[11px] text-gray-500">{label}</span>
            <span className={`mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm ${date === today ? "bg-siam-blue font-semibold text-white" : ""} ${date === anchor && date !== today ? "bg-gray-200 font-semibold dark:bg-gray-700" : ""}`}>
              {Number(date.slice(-2))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TimeGrid({
  days,
  jobs,
  today,
  nowMinutes,
  onOpen,
  onDropRequest,
}: {
  days: string[];
  jobs: CalendarJobRecord[];
  today: string;
  nowMinutes: number;
  onOpen: (id: string) => void;
  onDropRequest: (caseId: string, date: string, time: string) => void;
}) {
  const showNow = days.includes(today) && nowMinutes >= CALENDAR_START_HOUR * 60 && nowMinutes <= (CALENDAR_END_HOUR + 1) * 60;
  return (
    <div data-time-grid className={days.length > 3 ? "min-w-[52rem]" : "min-w-[20rem]"}>
      <div className="grid border-b border-gray-200 dark:border-gray-800" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0,1fr))` }}>
        <div />
        {days.map((date) => {
          const label = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", weekday: "short" }).format(new Date(`${date}T12:00:00+07:00`));
          return (
            <div key={date} className={`border-l border-gray-200 py-2 text-center dark:border-gray-800 ${date === today ? "bg-sky-50/70 dark:bg-sky-950/30" : ""}`}>
              <div className="text-[11px] uppercase text-gray-500">{label}</div>
              <div className={`mx-auto mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm ${date === today ? "bg-siam-blue font-semibold text-white" : ""}`}>
                {Number(date.slice(-2))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid border-b border-gray-200 dark:border-gray-800" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0,1fr))` }}>
        <div className="px-1 py-1 text-[10px] uppercase text-gray-400">All day</div>
        {days.map((date) => (
          <div key={date} className="max-h-24 space-y-0.5 overflow-y-auto border-l border-gray-200 p-0.5 dark:border-gray-800">
            {jobsOnDate(jobs, date)
              .filter((job) => job.allDay || (job.start != null && (bangkokHour(job.start) < CALENDAR_START_HOUR || bangkokHour(job.start) > CALENDAR_END_HOUR)))
              .map((job) => (
                <button key={job.caseId} type="button" className="block w-full" aria-label={eventLabel(job)} onClick={() => onOpen(job.caseId)}>
                  <AllDayChip job={job} />
                </button>
              ))}
          </div>
        ))}
      </div>
      <div className="relative">
        {HOURS.map((hour) => (
          <div key={hour} className="grid border-b border-gray-100 dark:border-gray-800" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0,1fr))`, height: HOUR_PX }}>
            <div className="-mt-2 pr-2 text-right text-[11px] text-gray-500">{hourLabel(hour)}</div>
            {days.map((date) => (
              <Link
                key={`${date}-${hour}`}
                href={createHref(date, timeValue(hour))}
                aria-label={`Create job on ${dayHeading(date)} at ${hourLabel(hour)}`}
                className={`border-l border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900 ${date === today ? "bg-sky-50/40 dark:bg-sky-950/20" : ""}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const caseId = event.dataTransfer.getData("text/plain");
                  if (caseId) onDropRequest(caseId, date, timeValue(hour));
                }}
              />
            ))}
          </div>
        ))}
        <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0,1fr))` }}>
          <div />
          {days.map((date) => (
            <div key={date} className="relative">
              {placeEvents(jobsOnDate(jobs, date)).map((item) => (
                <button
                  key={item.job.caseId}
                  type="button"
                  draggable
                  data-event
                  aria-label={eventLabel(item.job)}
                  className="pointer-events-auto absolute overflow-hidden"
                  style={{
                    top: ((item.start - CALENDAR_START_HOUR * 60) / 60) * HOUR_PX + 2,
                    height: HOUR_PX - 6,
                    left: `calc(${(item.lane / item.lanes) * 100}% + 2px)`,
                    width: `calc(${100 / item.lanes}% - 4px)`,
                  }}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", item.job.caseId);
                    event.currentTarget.closest("[data-time-grid]")?.querySelectorAll<HTMLElement>("[data-event]").forEach((el) => {
                      if (el !== event.currentTarget) el.classList.add("pointer-events-none");
                    });
                  }}
                  onDragEnd={(event) => {
                    event.currentTarget.closest("[data-time-grid]")?.querySelectorAll("[data-event]").forEach((el) => {
                      el.classList.remove("pointer-events-none");
                    });
                  }}
                  onClick={() => onOpen(item.job.caseId)}
                >
                  <EventCard job={item.job} dense />
                </button>
              ))}
            </div>
          ))}
        </div>
        {showNow && (
          <div className="pointer-events-none absolute right-0 border-t-2 border-red-500" style={{ left: "3.5rem", top: ((nowMinutes - CALENDAR_START_HOUR * 60) / 60) * HOUR_PX }} aria-hidden>
            <span className="absolute -top-2.5 left-0 rounded bg-red-500 px-1 text-[10px] font-semibold text-white">Now</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DaySchedule({
  date,
  jobs,
  today,
  nowMinutes,
  onOpen,
  detailed = false,
}: {
  date: string;
  jobs: CalendarJobRecord[];
  today: boolean;
  nowMinutes: number;
  onOpen: (id: string) => void;
  detailed?: boolean;
}) {
  const allDay = jobs.filter((job) => job.allDay || (job.start != null && (bangkokHour(job.start) < CALENDAR_START_HOUR || bangkokHour(job.start) > CALENDAR_END_HOUR)));
  return (
    <div>
      <h2 className="px-4 py-3 text-lg font-medium">{dayHeading(date)}</h2>
      {allDay.length > 0 && (
        <div className="space-y-1 border-b border-gray-200 px-3 pb-2 dark:border-gray-800">
          {allDay.map((job) => (
            <button key={job.caseId} type="button" className="block w-full" aria-label={eventLabel(job)} onClick={() => onOpen(job.caseId)}>
              <EventCard job={job} />
            </button>
          ))}
        </div>
      )}
      {HOURS.map((hour) => {
        const slotJobs = jobs.filter((job) => !job.allDay && job.start && bangkokHour(job.start) === hour);
        const showNow = today && nowMinutes >= hour * 60 && nowMinutes < (hour + 1) * 60;
        return (
          <div key={hour} className="grid grid-cols-[4.5rem_1fr] border-b border-gray-100 dark:border-gray-800">
            <div className="px-2 py-2 text-xs text-gray-500">{hourLabel(hour)}</div>
            <div className={`relative min-h-16 border-l border-gray-100 px-2 py-1 dark:border-gray-800 ${today ? "bg-sky-50/40 dark:bg-sky-950/20" : ""}`}>
              {showNow && <p className="mb-1 text-xs font-semibold text-red-600">Now</p>}
              {slotJobs.map((job) => (
                <button key={job.caseId} type="button" className="mb-1 block w-full" aria-label={eventLabel(job)} onClick={() => onOpen(job.caseId)}>
                  {detailed ? <DayDetail job={job} /> : <EventCard job={job} />}
                </button>
              ))}
              {slotJobs.length === 0 && (
                <Link href={createHref(date, timeValue(hour))} className="block min-h-14 rounded-lg text-xs text-gray-400 hover:bg-white/80 dark:hover:bg-gray-900" aria-label={`Create job on ${dayHeading(date)} at ${hourLabel(hour)}`}>
                  <span className="sr-only">Create job at {hourLabel(hour)}</span>
                </Link>
              )}
            </div>
          </div>
        );
      })}
      {jobs.length === 0 && <p className="px-4 py-6 text-sm text-gray-500">Nothing scheduled.</p>}
    </div>
  );
}

function DayDetail({ job }: { job: CalendarJobRecord }) {
  const style = provinceStyle(job.province);
  return (
    <span className="block rounded-xl border border-gray-200 bg-white px-3 py-2 text-left dark:border-gray-700 dark:bg-gray-900" style={{ boxShadow: `inset 4px 0 0 ${style.accent}` }}>
      <span className="block text-sm font-semibold">{job.start ? clockLabel(job.start, job.allDay) : "Time TBD"}</span>
      <span className="block text-base font-semibold">{job.customerName}</span>
      <span className="block text-sm">{job.serviceName}</span>
      <span className="mt-1 block text-sm text-gray-600 dark:text-gray-300">{job.province ?? "Province needed"}</span>
      <span className="block text-sm text-gray-600 dark:text-gray-300">{job.staffName}</span>
      {job.status === "cancelled" && <span className="block text-sm line-through">Cancelled</span>}
    </span>
  );
}

function AgendaList({
  dates,
  jobs,
  today,
  nowMinutes,
  onOpen,
}: {
  dates: string[];
  jobs: CalendarJobRecord[];
  today: string;
  nowMinutes: number;
  onOpen: (id: string) => void;
}) {
  const groups = dates
    .map((date) => ({ date, jobs: jobsOnDate(jobs, date) }))
    .filter((group) => group.jobs.length > 0 || group.date === today);
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-800">
      {groups.map((group) => (
        <section key={group.date} className="px-3 py-3">
          <h2 id={group.date === today ? "calendar-today" : undefined} className="text-sm font-semibold">
            {group.date === today ? "Today · " : ""}
            {dayHeading(group.date)}
          </h2>
          {group.jobs.length === 0 && <p className="mt-2 text-sm text-gray-500">Nothing scheduled.</p>}
          <ul className="mt-2 space-y-2">
            {group.jobs.map((job) => {
              const minutes = job.start && !job.allDay ? bangkokMinutes(job.start) : null;
              const upcoming = group.date === today && minutes != null && minutes >= nowMinutes;
              return (
                <li key={job.caseId}>
                  {upcoming && minutes != null && minutes < nowMinutes + 60 && <p className="mb-1 text-xs font-semibold text-red-600">Coming up</p>}
                  <button type="button" className="block w-full" aria-label={eventLabel(job)} onClick={() => onOpen(job.caseId)}>
                    <DayDetail job={job} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {groups.length === 0 && <p className="px-4 py-8 text-sm text-gray-500">Nothing scheduled in this range.</p>}
    </div>
  );
}

function JobPopover({
  job,
  staff,
  pending,
  error,
  onClose,
  onReschedule,
  onStaff,
  onProvince,
  onStatus,
}: {
  job: CalendarJobRecord;
  staff: StaffOption[];
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onReschedule: (date: string, time: string, timeTbd: boolean) => void;
  onStaff: (staffId: string | null) => void;
  onProvince: (province: string | null) => void;
  onStatus: (status: "completed" | "cancelled") => void;
}) {
  const date = jobDate(job);
  const time = job.start && !job.allDay
    ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(job.start))
    : "09:00";
  const [nextDate, setNextDate] = useState(date);
  const [nextTime, setNextTime] = useState(time);
  const [timeTbd, setTimeTbd] = useState(job.allDay || !job.start);
  const [editing, setEditing] = useState(!job.start);
  const style = provinceStyle(job.province);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-start md:justify-end md:bg-transparent md:p-4" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-job-title"
        className="max-h-[88vh] w-full overflow-auto rounded-t-2xl bg-white p-4 shadow-2xl dark:bg-gray-950 md:mt-28 md:w-96 md:rounded-2xl md:border md:border-gray-200 dark:md:border-gray-700"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0" style={{ boxShadow: `inset 3px 0 0 ${style.accent}`, paddingLeft: 10 }}>
            <h2 id="calendar-job-title" className="truncate text-lg font-semibold">{job.customerName}</h2>
            <p className="truncate text-sm">{job.serviceName}</p>
          </div>
          <button type="button" className="inline-flex h-11 w-11 items-center justify-center" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <dl className="mt-3 space-y-1 text-sm">
          <div>{job.start ? clockLabel(job.start, job.allDay) : "Unscheduled"}</div>
          <div>{date ? dayHeading(date) : "No date yet"}</div>
          <div>{job.province ?? "Province needed"}</div>
          <div>{job.staffName}</div>
          {job.location && <div className="text-gray-600 dark:text-gray-300">{job.location}</div>}
          <div className="pt-1 text-gray-600 dark:text-gray-300">
            {formatThb(job.totalSatang)} · Deposit {formatThb(job.depositSatang)}
          </div>
          {job.invoiceNumber && <div>Invoice {job.invoiceNumber}</div>}
        </dl>
        {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link href={`/admin/jobs/${job.caseId}`} className="inline-flex h-11 items-center justify-center rounded-lg border text-sm font-medium">Open job</Link>
          <Link href={`/admin/jobs/${job.caseId}`} className="inline-flex h-11 items-center justify-center rounded-lg border text-sm font-medium">Edit</Link>
          <button type="button" className="h-11 rounded-lg border text-sm font-medium" onClick={() => setEditing((open) => !open)}>Reschedule</button>
          {job.invoiceId ? (
            <Link href={`/admin/invoices/${job.invoiceId}`} className="inline-flex h-11 items-center justify-center rounded-lg border text-sm font-medium">Invoice</Link>
          ) : (
            <span className="inline-flex h-11 items-center justify-center rounded-lg border text-sm text-gray-400">No invoice</span>
          )}
          {job.customerPhone && <a href={`tel:${job.customerPhone}`} className="inline-flex h-11 items-center justify-center rounded-lg border text-sm">Call</a>}
          {job.customerPhone && <a href={waHref(job.customerPhone)} className="inline-flex h-11 items-center justify-center rounded-lg border text-sm">WhatsApp</a>}
          {job.status !== "completed" && job.status !== "cancelled" && (
            <button type="button" disabled={pending} className="h-11 rounded-lg border text-sm" onClick={() => onStatus("completed")}>Mark complete</button>
          )}
          {job.status !== "cancelled" && (
            <button type="button" disabled={pending} className="h-11 rounded-lg border text-sm" onClick={() => onStatus("cancelled")}>Cancel job</button>
          )}
        </div>
        {editing && (
          <form
            className="mt-3 space-y-2 border-t border-gray-200 pt-3 dark:border-gray-800"
            onSubmit={(event) => {
              event.preventDefault();
              if (!nextDate) return;
              onReschedule(nextDate, nextTime, timeTbd);
            }}
          >
            <label className="block text-sm">
              Date
              <input type="date" required value={nextDate} onChange={(event) => setNextDate(event.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3 dark:border-gray-600 dark:bg-gray-900" />
            </label>
            <label className="block text-sm">
              Time
              <input type="time" value={nextTime} disabled={timeTbd} onChange={(event) => setNextTime(event.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3 dark:border-gray-600 dark:bg-gray-900" />
            </label>
            <label className="flex h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={timeTbd} onChange={(event) => setTimeTbd(event.target.checked)} />
              Time is TBD
            </label>
            <button type="submit" disabled={pending} className="h-11 w-full rounded-lg bg-siam-blue text-sm font-semibold text-white disabled:opacity-60">
              {pending ? "Saving…" : "Save schedule"}
            </button>
          </form>
        )}
        <label className="mt-3 block text-sm">
          Staff
          <select className="mt-1 h-11 w-full rounded-lg border px-2 dark:border-gray-600 dark:bg-gray-900" value={job.staffId ?? ""} disabled={pending} onChange={(event) => onStaff(event.target.value || null)}>
            <option value="">TBD</option>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>{staffLabel(person)}</option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-sm">
          Province
          <select className="mt-1 h-11 w-full rounded-lg border px-2 dark:border-gray-600 dark:bg-gray-900" value={job.province ?? ""} disabled={pending} onChange={(event) => onProvince(event.target.value || null)}>
            <option value="">Province needed</option>
            {provinceOptions().map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  body,
  confirmLabel = "Confirm",
  pending,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel?: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 md:items-center" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="calendar-confirm-title" className="w-full max-w-md rounded-2xl bg-white p-4 dark:bg-gray-950">
        <h2 id="calendar-confirm-title" className="text-lg font-bold">{title}</h2>
        <p className="mt-2 text-sm">{body}</p>
        <div className="mt-4 flex gap-2">
          <button type="button" className="h-11 flex-1 rounded-lg border" onClick={onCancel}>Cancel</button>
          <button type="button" disabled={pending} className="h-11 flex-1 rounded-lg bg-siam-blue font-semibold text-white disabled:opacity-60" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

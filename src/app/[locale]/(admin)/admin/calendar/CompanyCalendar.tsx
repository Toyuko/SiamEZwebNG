"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { formatThb } from "@/lib/jobs/intake";
import { provinceOptions, provinceStyle } from "@/lib/calendar/provinces";
import {
  CALENDAR_END_HOUR,
  CALENDAR_START_HOUR,
  bangkokClockMinutes,
  jobsOnDate,
  monthCells,
  shiftAnchor,
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
  provinces: Array<{ name: string; count: number; color: string; textColor: string }>;
};

const VIEWS: CalendarViewName[] = ["agenda", "day", "week", "month"];
const HOURS = Array.from({ length: CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1 }, (_, index) => CALENDAR_START_HOUR + index);

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

function bangkokHour(iso: string) {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
  return Number(hour);
}

function dayHeading(date: string) {
  const noon = new Date(`${date}T12:00:00+07:00`);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(noon);
}

function waHref(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `66${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
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
}) {
  const router = useRouter();
  const touchX = useRef<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [move, setMove] = useState<{ caseId: string; date: string; time: string; label: string } | null>(null);
  const [warnings, setWarnings] = useState<ScheduleWarning[] | null>(null);
  const [warningMove, setWarningMove] = useState<{ caseId: string; date: string; time: string; timeTbd: boolean } | null>(null);
  const [nowMinutes, setNowMinutes] = useState(() => bangkokClockMinutes());

  const selected = useMemo(
    () => [...jobs, ...unscheduled].find((job) => job.caseId === selectedId) ?? null,
    [jobs, unscheduled, selectedId]
  );
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMinutes(bangkokClockMinutes()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedId(null);
        setWarnings(null);
        setMove(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function href(next: Partial<CalendarFilters & { view: CalendarViewName; date: string }>) {
    const params = new URLSearchParams();
    const date = next.date ?? anchor;
    const nextView = next.view ?? view;
    params.set("date", date);
    params.set("view", nextView);
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

  function go(next: Parameters<typeof href>[0]) {
    router.push(href(next));
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

  const week = weekDates(anchor);
  const month = monthCells(anchor);
  const visibleDays = view === "week" ? week : [anchor];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="print:hidden sticky top-14 z-20 -mx-4 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 dark:border-gray-800 dark:bg-gray-950/95">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <button type="button" className="min-h-11 rounded-lg bg-siam-blue px-3 text-sm font-semibold text-white" onClick={() => go({ date: today })}>
            Today
          </button>
          <button type="button" className="min-h-11 rounded-lg border px-3 text-sm" aria-label="Previous" onClick={() => go({ date: shiftAnchor(anchor, view, -1) })}>
            Prev
          </button>
          <button type="button" className="min-h-11 rounded-lg border px-3 text-sm" aria-label="Next" onClick={() => go({ date: shiftAnchor(anchor, view, 1) })}>
            Next
          </button>
          <p className="text-sm font-medium">{view === "week" ? `${week[0]} – ${week[6]}` : dayHeading(anchor)}</p>
          <Link href={`/admin/jobs/new?date=${anchor}&time=09:00`} className="ml-auto inline-flex min-h-11 items-center rounded-lg bg-siam-yellow px-3 text-sm font-semibold text-siam-blue-dark">
            Add job
          </Link>
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto" role="tablist" aria-label="Calendar view">
          {VIEWS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={view === item}
              className={`min-h-11 shrink-0 rounded-full px-3 text-sm capitalize ${view === item ? "bg-siam-blue text-white" : "border"}`}
              onClick={() => go({ view: item })}
            >
              {item}
            </button>
          ))}
        </div>
        <form
          className="mt-2 grid gap-2 sm:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            go({
              q: String(data.get("q") ?? ""),
              staffId: String(data.get("staff") ?? ""),
              serviceId: String(data.get("service") ?? ""),
              status: String(data.get("status") ?? "all"),
            });
          }}
        >
          <input name="q" defaultValue={filters.q} placeholder="Search name, phone, invoice…" aria-label="Search calendar" className="min-h-11 rounded-lg border px-3 text-base sm:col-span-4" />
          <select name="staff" defaultValue={filters.staffId} aria-label="Staff" className="min-h-11 rounded-lg border px-2 text-base">
            <option value="">All staff</option>
            <option value="tbd">TBD</option>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name || person.email}
              </option>
            ))}
          </select>
          <select name="service" defaultValue={filters.serviceId} aria-label="Service" className="min-h-11 rounded-lg border px-2 text-base">
            <option value="">All services</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={filters.status} aria-label="Status" className="min-h-11 rounded-lg border px-2 text-base">
            <option value="all">All</option>
            <option value="confirmed">Confirmed</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="tbd">TBD</option>
          </select>
          <button type="submit" className="min-h-11 rounded-lg border px-3 text-sm font-medium">
            Apply
          </button>
        </form>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {truncated && <p className="mt-3 text-sm text-amber-700">Showing the first matching jobs. Narrow the date or search.</p>}

      <section className="mt-4 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-4 dark:border-gray-800 dark:bg-gray-950" aria-label="Today summary">
        <SummaryStat label="Jobs" value={String(summary.jobs)} />
        <SummaryStat label="Deal value" value={formatThb(summary.dealValueSatang)} />
        <SummaryStat label="Deposits" value={formatThb(summary.depositSatang)} />
        <SummaryStat label="Outstanding" value={formatThb(summary.outstandingSatang)} />
        <div className="sm:col-span-4 flex flex-wrap gap-2">
          {summary.provinces.length === 0 && <span className="text-sm text-gray-500">No jobs in this view.</span>}
          {summary.provinces.map((item) => (
            <button
              key={item.name}
              type="button"
              className="min-h-11 rounded-full px-3 text-sm"
              style={{ background: item.color, color: item.textColor }}
              onClick={() => go({ provinces: item.name === "Other" || item.name === "Province needed" ? [""] : [item.name] })}
            >
              {item.name}: {item.count}
            </button>
          ))}
        </div>
      </section>

      <details className="mt-3 rounded-2xl border bg-white p-3 dark:border-gray-800 dark:bg-gray-950">
        <summary className="min-h-11 cursor-pointer text-sm font-medium">Province legend</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {provinceOptions().map((name) => {
            const style = provinceStyle(name);
            const active = filters.provinces.includes(name);
            return (
              <button
                key={name}
                type="button"
                aria-pressed={active}
                className="min-h-11 rounded-full px-3 text-sm"
                style={{ background: style.color, color: style.textColor, outline: active ? "2px solid currentColor" : undefined }}
                onClick={() => {
                  const provinces = active ? filters.provinces.filter((item) => item !== name) : [...filters.provinces, name];
                  go({ provinces });
                }}
              >
                {name}
              </button>
            );
          })}
        </div>
      </details>

      <div
        className="mt-4"
        onTouchStart={(event) => {
          touchX.current = event.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (touchX.current == null || view === "month") return;
          const delta = (event.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
          if (Math.abs(delta) < 60) return;
          go({ date: shiftAnchor(anchor, view === "week" ? "week" : "day", delta < 0 ? 1 : -1) });
        }}
      >
        {view === "month" && (
          <MonthGrid
            cells={month}
            jobs={jobs}
            today={today}
            onOpenDay={(date) => go({ view: "agenda", date })}
          />
        )}
        {view === "week" && (
          <WeekGrid
            days={visibleDays}
            jobs={jobs}
            today={today}
            nowMinutes={nowMinutes}
            onOpen={setSelectedId}
            onDropRequest={(caseId, date, time, label) => setMove({ caseId, date, time, label })}
          />
        )}
        {(view === "day" || view === "agenda") && (
          <DayList jobs={jobsOnDate(jobs, anchor)} today={anchor === today} nowMinutes={nowMinutes} onOpen={setSelectedId} />
        )}
        {otherEvents.length > 0 && (
          <section className="mt-4">
            <h2 className="text-sm font-semibold text-gray-500">Other appointments</h2>
            <ul className="mt-2 space-y-2">
              {otherEvents.map((event) => (
                <li key={event.id}>
                  <Link href={`/admin/calendar/${event.id}`} className="block min-h-11 rounded-xl border px-3 py-2 text-sm">
                    {clockLabel(event.start, event.allDay)} · {event.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
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
                <td>{job.start ? job.start.slice(0, 10) : "TBD"}</td>
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
      <details className="print:hidden mt-4 rounded-2xl border bg-white p-3 dark:border-gray-800 dark:bg-gray-950">
        <summary className="min-h-11 cursor-pointer text-lg font-semibold">
          Unscheduled jobs ({unscheduled.length === 40 ? "40+" : unscheduled.length})
        </summary>
        {unscheduled.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">Every confirmed job in this list has a date.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {unscheduled.map((job) => (
              <li key={job.caseId} className="flex flex-wrap items-center gap-2 rounded-xl border p-3">
                <button type="button" className="min-h-11 flex-1 text-left" onClick={() => setSelectedId(job.caseId)}>
                  <span className="block font-medium">{job.customerName}</span>
                  <span className="block text-sm text-gray-600">
                    {job.serviceName} · {job.province ?? "Province needed"} · {job.staffName}
                  </span>
                </button>
                <Link href={`/admin/jobs/${job.caseId}`} className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm">
                  Schedule
                </Link>
              </li>
            ))}
          </ul>
        )}
      </details>

      <button type="button" className="print:hidden mt-4 min-h-11 rounded-lg border px-3 text-sm" onClick={() => window.print()}>
        Print day / week
      </button>

      {canRepair && (
        <details className="print:hidden mt-4 rounded-2xl border p-3">
          <summary className="min-h-11 cursor-pointer font-medium">Calendar health</summary>
          {health && (
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>Scheduled jobs: {health.scheduled}</div>
              <div>Calendar events: {health.linked}</div>
              <div>Missing calendar events: {health.missing}</div>
              <div>Duplicate calendar events: {health.duplicates}</div>
              <div>Unscheduled confirmed jobs: {health.unscheduled}</div>
            </dl>
          )}
          {report && <p className="mt-2 text-sm">{report}</p>}
          <button
            type="button"
            disabled={pending}
            className="mt-3 min-h-11 rounded-lg bg-siam-blue px-3 text-sm font-semibold text-white disabled:opacity-60"
            onClick={() => run(() => syncCalendarAction())}
          >
            {pending ? "Syncing…" : "Sync existing jobs to calendar"}
          </button>
        </details>
      )}

      {selected && (
        <JobSheet
          job={selected}
          staff={staff}
          pending={pending}
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
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function EventFace({ job }: { job: CalendarJobRecord }) {
  const style = provinceStyle(job.province);
  const cancelled = job.status === "cancelled";
  const completed = job.status === "completed";
  return (
    <span
      className={`block rounded-lg px-2 py-1 text-left text-xs leading-snug ${cancelled ? "line-through opacity-70" : ""} ${completed ? "opacity-80" : ""}`}
      style={{ background: style.color, color: style.textColor }}
    >
      <span className="block font-semibold">{job.start ? clockLabel(job.start, job.allDay) : "TBD"} · {job.customerName}</span>
      <span className="block">{job.serviceName}</span>
      <span className="block">{job.province ?? "Province needed"} · {job.staffName}</span>
      {cancelled && <span className="block">Cancelled</span>}
      {completed && <span className="block">Completed</span>}
    </span>
  );
}

function MonthGrid({
  cells,
  jobs,
  today,
  onOpenDay,
}: {
  cells: Array<string | null>;
  jobs: CalendarJobRecord[];
  today: string;
  onOpenDay: (date: string) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className="py-1">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, index) => {
          const dayJobs = date ? jobsOnDate(jobs, date) : [];
          return (
            <button
              key={date ?? `empty-${index}`}
              type="button"
              disabled={!date}
              onClick={() => date && onOpenDay(date)}
              className={`min-h-16 rounded-lg border p-1 text-left md:min-h-28 ${date === today ? "border-siam-blue" : "border-gray-200"}`}
            >
              {date && <span className="text-xs">{Number(date.slice(-2))}</span>}
              <span className="mt-1 flex flex-wrap gap-1 md:hidden" aria-hidden>
                {dayJobs.slice(0, 4).map((job) => (
                  <span key={job.caseId} className="h-2 w-2 rounded-full" style={{ background: provinceStyle(job.province).textColor }} />
                ))}
              </span>
              <span className="mt-1 hidden space-y-1 md:block">
                {dayJobs.slice(0, 3).map((job) => (
                  <span key={job.caseId} className="block truncate text-[11px]" style={{ color: provinceStyle(job.province).textColor }}>
                    {job.customerName} · {job.province ?? "Province needed"}
                  </span>
                ))}
                {dayJobs.length > 3 && <span className="block text-[11px] text-gray-500">+{dayJobs.length - 3}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
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
  onDropRequest: (caseId: string, date: string, time: string, label: string) => void;
}) {
  return (
    <div className="space-y-3">
      {days.map((date) => (
        <section key={date} className={`rounded-2xl border p-2 ${date === today ? "border-siam-blue" : ""}`}>
          <h3 className="px-1 text-sm font-semibold">{dayHeading(date)}</h3>
          <div className="mt-1 hidden space-y-1 md:block">
            {jobsOnDate(jobs, date)
              .filter((job) => job.allDay || (job.start != null && (bangkokHour(job.start) < CALENDAR_START_HOUR || bangkokHour(job.start) > CALENDAR_END_HOUR)))
              .map((job) => (
                <button key={job.caseId} type="button" className="block w-full" onClick={() => onOpen(job.caseId)} aria-label={`${job.customerName} ${job.serviceName} ${job.province ?? "Province needed"} ${job.staffName}`}>
                  <EventFace job={job} />
                </button>
              ))}
          </div>
          <div className="mt-2 hidden gap-1 md:grid">
            {HOURS.map((hour) => {
              const time = `${String(hour).padStart(2, "0")}:00`;
              const slotJobs = jobsOnDate(jobs, date).filter((job) => !job.allDay && job.start && bangkokHour(job.start) === hour);
              const showNow = date === today && nowMinutes >= hour * 60 && nowMinutes < (hour + 1) * 60;
              return (
                <div
                  key={time}
                  className="grid grid-cols-[4.5rem_1fr] gap-2 border-t py-1"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const caseId = event.dataTransfer.getData("text/plain");
                    if (!caseId) return;
                    onDropRequest(caseId, date, time, `${date} ${time}`);
                  }}
                >
                  <div className="text-xs text-gray-500">
                    {time}
                    {showNow && <span className="mt-1 block font-semibold text-red-600">Current time</span>}
                  </div>
                  <div className="space-y-1">
                    {slotJobs.map((job) => (
                      <button
                        key={job.caseId}
                        type="button"
                        draggable
                        onDragStart={(event) => event.dataTransfer.setData("text/plain", job.caseId)}
                        onClick={() => onOpen(job.caseId)}
                        className="block w-full"
                        aria-label={`${clockLabel(job.start!, false)} ${job.customerName} ${job.serviceName} ${job.province ?? "Province needed"} ${job.staffName}`}
                      >
                        <EventFace job={job} />
                      </button>
                    ))}
                    {slotJobs.length === 0 && (
                      <Link href={`/admin/jobs/new?date=${date}&time=${time}`} className="block min-h-11 rounded-lg text-xs text-gray-400 hover:bg-gray-50">
                        Add {time}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 md:hidden">
            {jobsOnDate(jobs, date).length > 0 && (
              <DayList jobs={jobsOnDate(jobs, date)} today={date === today} nowMinutes={nowMinutes} onOpen={onOpen} />
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function DayList({
  jobs,
  today,
  nowMinutes,
  onOpen,
}: {
  jobs: CalendarJobRecord[];
  today: boolean;
  nowMinutes: number;
  onOpen: (id: string) => void;
}) {
  const currentInserted = { done: false };
  return (
    <ul className="space-y-2">
      {jobs.map((job) => {
        const minutes = job.start && !job.allDay ? bangkokHour(job.start) * 60 : null;
        const showNow = today && !currentInserted.done && minutes != null && minutes >= nowMinutes;
        if (showNow) currentInserted.done = true;
        return (
          <li key={job.caseId}>
            {showNow && <p className="mb-2 text-xs font-semibold text-red-600">Current time</p>}
            <button
              type="button"
              onClick={() => onOpen(job.caseId)}
              className="block w-full"
              aria-label={`${job.start ? clockLabel(job.start, job.allDay) : "TBD"} ${job.customerName} ${job.serviceName} ${job.province ?? "Province needed"} ${job.staffName}`}
            >
              <EventFace job={job} />
            </button>
          </li>
        );
      })}
      {jobs.length === 0 && <li className="text-sm text-gray-500">Nothing scheduled.</li>}
    </ul>
  );
}

function JobSheet({
  job,
  staff,
  pending,
  onClose,
  onReschedule,
  onStaff,
  onProvince,
  onStatus,
}: {
  job: CalendarJobRecord;
  staff: StaffOption[];
  pending: boolean;
  onClose: () => void;
  onReschedule: (date: string, time: string, timeTbd: boolean) => void;
  onStaff: (staffId: string | null) => void;
  onProvince: (province: string | null) => void;
  onStatus: (status: "completed" | "cancelled") => void;
}) {
  const date = job.start
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(job.start))
    : "";
  const time = job.start && !job.allDay
    ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(job.start))
    : "09:00";
  const [nextDate, setNextDate] = useState(date);
  const [nextTime, setNextTime] = useState(time);
  const [timeTbd, setTimeTbd] = useState(job.allDay || !job.start);
  const style = provinceStyle(job.province);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-job-title"
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-t-2xl bg-white p-4 dark:bg-gray-950 md:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium" style={{ color: style.textColor }}>{job.province ?? "Province needed"}</p>
            <h2 id="calendar-job-title" className="text-xl font-bold">{job.customerName}</h2>
            <p>{job.serviceName}</p>
          </div>
          <button type="button" className="min-h-11 min-w-11" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>
        <p className="mt-2 text-sm">
          {job.start ? `${dayHeading(date)} · ${clockLabel(job.start, job.allDay)}` : "Unscheduled"}
        </p>
        <p className="text-sm">Assigned: {job.staffName}</p>
        <p className="text-sm">Closed by: {job.closedByName ?? "—"}</p>
        <p className="text-sm">Location: {job.location ?? "—"}</p>
        <p className="mt-2 text-sm">Total {formatThb(job.totalSatang)} · Deposit {formatThb(job.depositSatang)} · Outstanding {formatThb(job.outstandingSatang)}</p>
        <p className="text-sm">Invoice: {job.invoiceNumber ?? "—"}</p>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {job.documents.length === 0 && <li>No documents listed</li>}
          {job.documents.map((doc) => (
            <li key={doc}>{doc}</li>
          ))}
        </ul>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link href={`/admin/jobs/${job.caseId}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border text-sm">Open job</Link>
          <Link href={`/admin/jobs/${job.caseId}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border text-sm">Edit</Link>
          {job.invoiceId && (
            <Link href={`/admin/invoices/${job.invoiceId}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border text-sm">View invoice</Link>
          )}
          {job.customerPhone && (
            <a href={`tel:${job.customerPhone}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border text-sm">Call customer</a>
          )}
          {job.customerPhone && (
            <a href={waHref(job.customerPhone)} className="inline-flex min-h-11 items-center justify-center rounded-lg border text-sm">Message customer</a>
          )}
          {job.status !== "completed" && job.status !== "cancelled" && (
            <button type="button" disabled={pending} className="min-h-11 rounded-lg border text-sm" onClick={() => onStatus("completed")}>Mark complete</button>
          )}
          {job.status !== "cancelled" && (
            <button type="button" disabled={pending} className="min-h-11 rounded-lg border text-sm" onClick={() => onStatus("cancelled")}>Cancel</button>
          )}
        </div>
        <form
          className="mt-4 space-y-2 border-t pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!nextDate) return;
            onReschedule(nextDate, nextTime, timeTbd);
          }}
        >
          <h3 className="font-semibold">Reschedule</h3>
          <label className="block text-sm">
            Date
            <input type="date" required value={nextDate} onChange={(event) => setNextDate(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3" />
          </label>
          <label className="block text-sm">
            Time
            <input type="time" value={nextTime} disabled={timeTbd} onChange={(event) => setNextTime(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3" />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={timeTbd} onChange={(event) => setTimeTbd(event.target.checked)} />
            Time is TBD
          </label>
          <button type="submit" disabled={pending} className="min-h-11 w-full rounded-lg bg-siam-blue text-sm font-semibold text-white disabled:opacity-60">
            {pending ? "Saving…" : "Save schedule"}
          </button>
        </form>
        <label className="mt-3 block text-sm">
          Change staff
          <select
            className="mt-1 min-h-11 w-full rounded-lg border px-2"
            value={job.staffId ?? ""}
            disabled={pending}
            onChange={(event) => onStaff(event.target.value || null)}
          >
            <option value="">TBD</option>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>{person.name || person.email}</option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-sm">
          Province
          <select
            className="mt-1 min-h-11 w-full rounded-lg border px-2"
            value={job.province ?? ""}
            disabled={pending}
            onChange={(event) => onProvince(event.target.value || null)}
          >
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
          <button type="button" className="min-h-11 flex-1 rounded-lg border" onClick={onCancel}>Cancel</button>
          <button type="button" disabled={pending} className="min-h-11 flex-1 rounded-lg bg-siam-blue font-semibold text-white disabled:opacity-60" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

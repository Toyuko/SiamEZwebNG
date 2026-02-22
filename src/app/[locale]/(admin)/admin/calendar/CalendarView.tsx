"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight, Plus, Calendar } from "lucide-react";
import { EventModal } from "./EventModal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getEventColorClass } from "./eventColors";
import { updateEvent } from "@/actions/admin";

type EventWithRelations = {
  id: string;
  title: string;
  description: string | null;
  start: Date;
  end: Date;
  type: string;
  allDay?: boolean;
  color?: string | null;
  caseId: string | null;
  staffId?: string | null;
  case?: { caseNumber: string } | null;
  user?: { name: string | null } | null;
  staff?: { name: string | null } | null;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(month: number, year: number) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startPad = first.getDay();
  const days = last.getDate();
  return { startPad, days };
}

function getWeekDates(centerDate: Date) {
  const day = centerDate.getDay();
  const diff = centerDate.getDate() - day;
  const start = new Date(centerDate);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

type CaseItem = { id: string; caseNumber: string };
type StaffItem = { id: string; name: string | null; email: string };

export function CalendarView({
  events,
  cases,
  staff,
  view,
  month,
  year,
  date,
}: {
  events: EventWithRelations[];
  cases: CaseItem[];
  staff: StaffItem[];
  view: string;
  month: number;
  year: number;
  date?: Date;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [modalDate, setModalDate] = useState<Date>(() => new Date());
  const [modalStart, setModalStart] = useState<Date | undefined>();
  const [modalEnd, setModalEnd] = useState<Date | undefined>();
  const [modalAllDay, setModalAllDay] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithRelations | null>(null);

  const openAddModal = (d: Date, hour?: number, allDay?: boolean) => {
    setModalMode("add");
    setModalDate(d);
    setModalAllDay(allDay ?? false);
    if (allDay) {
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      setModalStart(start);
      setModalEnd(end);
    } else if (hour !== undefined) {
      const start = new Date(d);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(d);
      end.setHours(hour + 1, 0, 0, 0);
      setModalStart(start);
      setModalEnd(end);
    } else {
      setModalStart(undefined);
      setModalEnd(undefined);
    }
    setEditingEvent(null);
    setModalOpen(true);
  };

  const openEditModal = (e: EventWithRelations) => {
    setModalMode("edit");
    setEditingEvent(e);
    setModalDate(new Date(e.start));
    setModalAllDay(e.allDay ?? false);
    setModalStart(undefined);
    setModalEnd(undefined);
    setModalOpen(true);
  };

  const handleDrop = async (
    eventId: string,
    targetDate: Date,
    targetHour?: number,
    forceAllDay?: boolean
  ) => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    const es = new Date(ev.start);
    const ee = new Date(ev.end);
    let newStart: Date;
    let newEnd: Date;
    const isAllDay = forceAllDay ?? ev.allDay === true;
    if (isAllDay) {
      newStart = new Date(targetDate);
      newStart.setHours(0, 0, 0, 0);
      newEnd = new Date(targetDate);
      newEnd.setHours(23, 59, 59, 999);
    } else if (targetHour !== undefined) {
      const durationMs = ee.getTime() - es.getTime();
      newStart = new Date(targetDate);
      newStart.setHours(targetHour, 0, 0, 0);
      newEnd = new Date(newStart.getTime() + durationMs);
    } else {
      const durationMs = ee.getTime() - es.getTime();
      const hour = es.getHours();
      const min = es.getMinutes();
      const sec = es.getSeconds();
      newStart = new Date(targetDate);
      newStart.setHours(hour, min, sec, 0);
      newEnd = new Date(newStart.getTime() + durationMs);
    }
    try {
      await updateEvent(eventId, {
        start: newStart,
        end: newEnd,
        ...(isAllDay && { allDay: true }),
      });
      router.refresh();
    } catch {
      // Ignore
    }
  };

  const now = new Date();
  const centerDate = date ?? new Date(year, month - 1, 1);

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const navUrl = (params: { view?: string; month?: number; year?: number; date?: string }) => {
    const p = new URLSearchParams();
    p.set("view", params.view ?? view);
    if (params.month !== undefined) p.set("month", String(params.month));
    if (params.year !== undefined) p.set("year", String(params.year));
    if (params.date !== undefined) p.set("date", params.date);
    return `${pathname}?${p.toString()}`;
  };

  const monthName = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const dayEvents = (d: Date) =>
    events.filter((e) => {
      const es = new Date(e.start);
      return (
        es.getFullYear() === d.getFullYear() &&
        es.getMonth() === d.getMonth() &&
        es.getDate() === d.getDate()
      );
    });

  const todayUrl = () => {
    const t = new Date();
    return navUrl({
      view,
      month: t.getMonth() + 1,
      year: t.getFullYear(),
      date: toISODate(t),
    });
  };

  const prevWeek = () => {
    const d = new Date(centerDate);
    d.setDate(d.getDate() - 7);
    router.push(navUrl({ view, month: d.getMonth() + 1, year: d.getFullYear(), date: toISODate(d) }));
  };

  const nextWeek = () => {
    const d = new Date(centerDate);
    d.setDate(d.getDate() + 7);
    router.push(navUrl({ view, month: d.getMonth() + 1, year: d.getFullYear(), date: toISODate(d) }));
  };

  const prevDay = () => {
    const d = new Date(centerDate);
    d.setDate(d.getDate() - 1);
    router.push(navUrl({ view, month: d.getMonth() + 1, year: d.getFullYear(), date: toISODate(d) }));
  };

  const nextDay = () => {
    const d = new Date(centerDate);
    d.setDate(d.getDate() + 1);
    router.push(navUrl({ view, month: d.getMonth() + 1, year: d.getFullYear(), date: toISODate(d) }));
  };

  const isToday = (d: Date) =>
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const eventStyle = (e: EventWithRelations, slotHeight: number) => {
    const es = new Date(e.start);
    const ee = new Date(e.end);
    const top = (es.getHours() + es.getMinutes() / 60) * slotHeight;
    const height = Math.max(((ee.getTime() - es.getTime()) / (60 * 60 * 1000)) * slotHeight, slotHeight * 0.5);
    return { top, height };
  };

  const renderMonthView = () => {
    const { startPad, days } = getDaysInMonth(month, year);
    return (
      <div className="grid grid-cols-7 gap-px rounded-lg border border-gray-200 bg-gray-200 dark:border-gray-700 dark:bg-gray-800">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="bg-gray-50 px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:bg-gray-900 dark:text-gray-400"
          >
            {w}
          </div>
        ))}
        {Array.from({ length: startPad }, (_, i) => (
          <div
            key={`pad-${i}`}
            className="min-h-[100px] bg-gray-50 dark:bg-gray-900/50"
          />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = i + 1;
          const d = new Date(year, month - 1, day);
          const evts = dayEvents(d);
          return (
            <button
              key={day}
              type="button"
              onClick={() => openAddModal(d)}
              onDragOver={(ev) => {
                ev.preventDefault();
                ev.dataTransfer.dropEffect = "move";
                ev.currentTarget.classList.add("ring-2", "ring-siam-blue");
              }}
              onDragLeave={(ev) => {
                ev.currentTarget.classList.remove("ring-2", "ring-siam-blue");
              }}
              onDrop={(ev) => {
                ev.preventDefault();
                ev.currentTarget.classList.remove("ring-2", "ring-siam-blue");
                const eventId = ev.dataTransfer.getData("eventId");
                if (eventId) handleDrop(eventId, d);
              }}
              className={cn(
                "group min-h-[100px] bg-white p-2 dark:bg-gray-950 text-left w-full",
                "flex flex-col transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/80"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                  isToday(d)
                    ? "bg-siam-blue text-white"
                    : "text-gray-700 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-gray-800"
                )}
              >
                {day}
              </span>
              <div className="mt-1 flex-1 space-y-0.5 overflow-hidden">
                {evts.slice(0, 4).map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    draggable
                    onDragStart={(ev) => {
                      ev.dataTransfer.setData("eventId", e.id);
                      ev.dataTransfer.effectAllowed = "move";
                      ev.stopPropagation();
                    }}
                    onDragOver={(ev) => {
                      ev.preventDefault();
                      ev.dataTransfer.dropEffect = "move";
                      ev.stopPropagation();
                    }}
                    onDrop={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      const eventId = ev.dataTransfer.getData("eventId");
                      if (eventId && eventId !== e.id) handleDrop(eventId, d);
                    }}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      openEditModal(e);
                    }}
                    className={cn(
                      "block truncate rounded px-1.5 py-0.5 text-xs font-medium border w-full text-left cursor-grab active:cursor-grabbing",
                      getEventColorClass(e)
                    )}
                  >
                    {e.title}
                  </button>
                ))}
                {evts.length > 4 && (
                  <span className="text-xs text-gray-500">+{evts.length - 4} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const slotHeight = 48;

  const renderWeekView = () => {
    const weekDates = getWeekDates(centerDate);
    const weekStart = new Date(weekDates[0]);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekDates[6]);
    weekEnd.setHours(23, 59, 59, 999);
    const weekEvtsAll = events.filter((e) => {
      const es = new Date(e.start);
      return es >= weekStart && es <= weekEnd;
    });
    const weekAllDayEvts = weekEvtsAll.filter((e) => e.allDay === true);
    const weekTimedEvts = weekEvtsAll.filter((e) => !e.allDay);

    return (
      <div className="relative overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 min-w-[700px]">
        {(
          <div className="grid border-b border-gray-200 dark:border-gray-700" style={{ gridTemplateColumns: `60px repeat(7, 1fr)` }}>
            <div className="border-r border-gray-200 px-2 py-1 text-xs font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
              All day
            </div>
            {weekDates.map((d) => (
              <div
                key={d.toISOString()}
                className="min-h-[32px] border-r border-b border-gray-100 p-1 dark:border-gray-800"
              >
                {weekAllDayEvts
                  .filter((e) => {
                    const es = new Date(e.start);
                    return (
                      es.getDate() === d.getDate() &&
                      es.getMonth() === d.getMonth() &&
                      es.getFullYear() === d.getFullYear()
                    );
                  })
                  .map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      draggable
                      onDragStart={(ev) => {
                        ev.dataTransfer.setData("eventId", e.id);
                        ev.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(ev) => {
                        ev.preventDefault();
                        ev.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        const eventId = ev.dataTransfer.getData("eventId");
                        if (eventId) handleDrop(eventId, d, undefined, true);
                      }}
                      onClick={() => openEditModal(e)}
                      className={cn(
                        "block w-full truncate rounded px-2 py-0.5 text-xs font-medium border text-left cursor-grab active:cursor-grabbing mb-0.5",
                        getEventColorClass(e)
                      )}
                    >
                      {e.title}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => openAddModal(d, undefined, true)}
                  className="w-full min-h-[24px] rounded hover:bg-siam-blue/5 dark:hover:bg-siam-blue/10 transition-colors text-left text-xs text-gray-500"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="grid" style={{ gridTemplateColumns: `60px repeat(7, 1fr)` }}>
          <div className="border-b border-r border-gray-200 dark:border-gray-700" />
          {weekDates.map((d) => (
            <div
              key={d.toISOString()}
              className={cn(
                "border-b border-r border-gray-200 py-2 text-center text-xs font-medium dark:border-gray-700",
                isToday(d) && "bg-siam-blue/10 dark:bg-siam-blue/20"
              )}
            >
              <span className={cn(isToday(d) && "font-bold text-siam-blue")}>
                {WEEKDAYS[d.getDay()]} {d.getDate()}
              </span>
            </div>
          ))}
          {HOURS.map((hour) => (
            <React.Fragment key={hour}>
              <div className="border-b border-r border-gray-200 py-1 pr-2 text-right text-xs text-gray-500 dark:border-gray-700">
                {hour === 0 ? "12 am" : hour < 12 ? `${hour} am` : hour === 12 ? "12 pm" : `${hour - 12} pm`}
              </div>
              {weekDates.map((d) => (
                <button
                  key={`${d.toISOString()}-${hour}`}
                  type="button"
                  onClick={() => openAddModal(d, hour)}
                  onDragOver={(ev) => {
                    ev.preventDefault();
                    ev.dataTransfer.dropEffect = "move";
                    ev.currentTarget.classList.add("bg-siam-blue/20");
                  }}
                  onDragLeave={(ev) => {
                    ev.currentTarget.classList.remove("bg-siam-blue/20");
                  }}
                  onDrop={(ev) => {
                    ev.preventDefault();
                    ev.currentTarget.classList.remove("bg-siam-blue/20");
                    const eventId = ev.dataTransfer.getData("eventId");
                    if (eventId) handleDrop(eventId, d, hour);
                  }}
                  className={cn(
                    "min-h-[48px] border-b border-r border-gray-100 dark:border-gray-800 w-full",
                    "hover:bg-siam-blue/5 dark:hover:bg-siam-blue/10 transition-colors"
                  )}
                  style={{ minHeight: slotHeight }}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
        <div
          className="absolute pointer-events-none z-10"
          style={{
            top: 40,
            left: 60,
            right: 0,
            bottom: 0,
          }}
        >
          <div className="relative w-full" style={{ height: 24 * slotHeight }}>
            {weekTimedEvts.map((e) => {
              const es = new Date(e.start);
              const ee = new Date(e.end);
              const dayIdx = weekDates.findIndex(
                (d) =>
                  d.getDate() === es.getDate() &&
                  d.getMonth() === es.getMonth() &&
                  d.getFullYear() === es.getFullYear()
              );
              if (dayIdx < 0) return null;
              const top = (es.getHours() + es.getMinutes() / 60) * slotHeight;
              const height = Math.max(
                ((ee.getTime() - es.getTime()) / (60 * 60 * 1000)) * slotHeight,
                24
              );
              const colWidth = 100 / 7;
              const left = (dayIdx / 7) * 100 + 1;
              const width = colWidth - 2;
              return (
                <button
                  key={e.id}
                  type="button"
                  draggable
                  onDragStart={(ev) => {
                    ev.dataTransfer.setData("eventId", e.id);
                    ev.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => openEditModal(e)}
                  className={cn(
                    "absolute rounded px-2 py-1 text-xs font-medium overflow-hidden border pointer-events-auto text-left cursor-grab active:cursor-grabbing",
                    getEventColorClass(e)
                  )}
                  style={{
                    top,
                    left: `${left}%`,
                    width: `${width}%`,
                    height: height - 2,
                    minHeight: 22,
                  }}
                >
                  <span className="block truncate">{e.title}</span>
                  <span className="text-[10px] opacity-80">{formatTime(es)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const weekDates = getWeekDates(centerDate);
  const dayEvtsAll = events.filter((e) => {
    const es = new Date(e.start);
    const d = new Date(centerDate);
    d.setHours(0, 0, 0, 0);
    return (
      es.getFullYear() === d.getFullYear() &&
      es.getMonth() === d.getMonth() &&
      es.getDate() === d.getDate()
    );
  });
  const dayAllDayEvts = dayEvtsAll.filter((e) => e.allDay === true);
  const dayEvts = dayEvtsAll
    .filter((e) => !e.allDay)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const titleText =
    view === "month"
      ? monthName
      : view === "week"
        ? `${weekDates[0]?.toLocaleDateString("short", { month: "short", day: "numeric", year: "numeric" })} - ${weekDates[6]?.toLocaleDateString("short", { month: "short", day: "numeric", year: "numeric" })}`
        : centerDate.toLocaleDateString("long");

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={todayUrl()} className="gap-1.5">
              <Calendar className="h-4 w-4" />
              Today
            </Link>
          </Button>
          {view === "month" ? (
            <Button variant="outline" size="icon" asChild>
              <Link href={navUrl({ view, month: prevMonth, year: prevYear })}>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="icon" onClick={view === "week" ? prevWeek : prevDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <h2 className="min-w-[200px] text-center text-lg font-semibold">{titleText}</h2>
          {view === "month" ? (
            <Button variant="outline" size="icon" asChild>
              <Link href={navUrl({ view, month: nextMonth, year: nextYear })}>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="icon" onClick={view === "week" ? nextWeek : nextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={view}
            onChange={(e) => {
              const v = e.target.value as "month" | "week" | "day";
              router.push(navUrl({ view: v, month, year, date: toISODate(centerDate) }));
            }}
          >
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
          </Select>
          <Button onClick={() => openAddModal(centerDate)}>
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>
      </div>

      {view === "month" && renderMonthView()}
      {view === "week" && (
        <div className="relative" style={{ minHeight: 600 }}>
          {renderWeekView()}
        </div>
      )}
      {view === "day" && (
        <div className="relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden min-h-[600px]">
          <div className="grid grid-cols-[60px_1fr] border-b border-gray-200 dark:border-gray-700">
            <div className="border-r border-gray-200 px-2 py-2 text-xs font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
              All day
            </div>
            <div
              className="p-2 space-y-1 min-h-[36px]"
              onDragOver={(ev) => {
                ev.preventDefault();
                ev.dataTransfer.dropEffect = "move";
              }}
              onDrop={(ev) => {
                ev.preventDefault();
                const eventId = ev.dataTransfer.getData("eventId");
                if (eventId) handleDrop(eventId, centerDate, undefined, true);
              }}
            >
              {dayAllDayEvts.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  draggable
                  onDragStart={(ev) => {
                    ev.dataTransfer.setData("eventId", e.id);
                    ev.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => openEditModal(e)}
                  className={cn(
                    "block w-full truncate rounded px-2 py-1 text-xs font-medium border text-left cursor-grab active:cursor-grabbing",
                    getEventColorClass(e)
                  )}
                >
                  {e.title}
                </button>
              ))}
              <button
                type="button"
                onClick={() => openAddModal(centerDate, undefined, true)}
                className="w-full rounded px-2 py-1 text-xs text-gray-500 hover:bg-siam-blue/5 dark:hover:bg-siam-blue/10 transition-colors text-left"
              >
                + Add
              </button>
            </div>
          </div>
          <div className="grid grid-cols-[60px_1fr]">
            <div
              className={cn(
                "py-3 text-center text-sm font-semibold border-r border-b border-gray-200 dark:border-gray-700",
                isToday(centerDate) && "bg-siam-blue/10 text-siam-blue dark:bg-siam-blue/20"
              )}
            >
              {centerDate.toLocaleDateString("long")}
            </div>
            <div className="border-b border-gray-200 dark:border-gray-700" />
            {HOURS.map((hour) => (
              <React.Fragment key={hour}>
                <div className="border-b border-r border-gray-200 py-1 pr-2 text-right text-xs text-gray-500 dark:border-gray-700">
                  {hour === 0 ? "12 am" : hour < 12 ? `${hour} am` : hour === 12 ? "12 pm" : `${hour - 12} pm`}
                </div>
                <button
                  type="button"
                  onClick={() => openAddModal(centerDate, hour)}
                  onDragOver={(ev) => {
                    ev.preventDefault();
                    ev.dataTransfer.dropEffect = "move";
                    ev.currentTarget.classList.add("bg-siam-blue/20");
                  }}
                  onDragLeave={(ev) => {
                    ev.currentTarget.classList.remove("bg-siam-blue/20");
                  }}
                  onDrop={(ev) => {
                    ev.preventDefault();
                    ev.currentTarget.classList.remove("bg-siam-blue/20");
                    const eventId = ev.dataTransfer.getData("eventId");
                    if (eventId) handleDrop(eventId, centerDate, hour);
                  }}
                  className={cn(
                    "min-h-[48px] border-b border-gray-100 dark:border-gray-800 w-full",
                    "hover:bg-siam-blue/5 dark:hover:bg-siam-blue/10 transition-colors"
                  )}
                  style={{ minHeight: slotHeight }}
                />
              </React.Fragment>
            ))}
          </div>
          <div
            className="absolute pointer-events-none z-10"
            style={{ top: 52, left: 60, right: 0, height: 24 * slotHeight }}
          >
            {dayEvts.map((e) => {
              const s = eventStyle(e, slotHeight);
              const es = new Date(e.start);
              const rowStart = es.getHours() + es.getMinutes() / 60;
              return (
                <button
                  key={e.id}
                  type="button"
                  draggable
                  onDragStart={(ev) => {
                    ev.dataTransfer.setData("eventId", e.id);
                    ev.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => openEditModal(e)}
                  className={cn(
                    "absolute left-2 right-2 block rounded px-3 py-2 text-sm font-medium overflow-hidden border pointer-events-auto text-left cursor-grab active:cursor-grabbing",
                    getEventColorClass(e)
                  )}
                  style={{
                    top: rowStart * slotHeight,
                    height: Math.max(s.height - 4, 36),
                  }}
                >
                  <span className="block truncate">{e.title}</span>
                  <span className="text-xs opacity-80">
                    {formatTime(new Date(e.start))} - {formatTime(new Date(e.end))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <EventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        defaultDate={modalDate}
        defaultStart={modalStart}
        defaultEnd={modalEnd}
        defaultAllDay={modalAllDay}
        editingEvent={editingEvent}
        cases={cases}
        staff={staff}
      />
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminGetFollowUpsForCalendar } from "@/actions/follow-ups";
import {
  FOLLOW_UP_PRIORITY_LABELS,
  FOLLOW_UP_STATUS_LABELS,
  PRIORITY_BADGE_CLASS,
  STATUS_BADGE_CLASS,
} from "@/lib/follow-ups/constants";
import {
  daysInMonth,
  formatDateOnly,
  formatDisplayDate,
  todayInBangkok,
} from "@/lib/follow-ups/dates";
import type { FollowUpPriority, FollowUpStatus } from "@prisma/client";

type CalendarItem = {
  id: string;
  title: string;
  dueDate: string;
  status: FollowUpStatus;
  priority: FollowUpPriority;
  client: { id: string; name: string | null; email: string };
  service: { id: string; name: string; slug: string } | null;
};

function toDateKey(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function monthBounds(year: number, month: number) {
  const from = formatDateOnly({ year, month, day: 1 });
  const to = formatDateOnly({
    year,
    month,
    day: daysInMonth(year, month),
  });
  return { from, to };
}

export function FollowUpCalendar({
  initialItems,
  initialYear,
  initialMonth,
}: {
  initialItems: CalendarItem[];
  initialYear: number;
  initialMonth: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [items, setItems] = useState(initialItems);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const today = todayInBangkok();
  const todayKey = formatDateOnly(today);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const key = toDateKey(item.dueDate);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  const loadMonth = (y: number, m: number) => {
    const { from, to } = monthBounds(y, m);
    startTransition(async () => {
      const rows = await adminGetFollowUpsForCalendar({ from, to });
      setItems(
        rows.map((r) => ({
          id: r.id,
          title: r.title,
          dueDate: toDateKey(r.dueDate),
          status: r.status,
          priority: r.priority,
          client: r.client,
          service: r.service,
        }))
      );
      setYear(y);
      setMonth(m);
      setSelectedDay(null);
    });
  };

  const prev = () => {
    const m = month === 1 ? 12 : month - 1;
    const y = month === 1 ? year - 1 : year;
    loadMonth(y, m);
  };

  const next = () => {
    const m = month === 12 ? 1 : month + 1;
    const y = month === 12 ? year + 1 : year;
    loadMonth(y, m);
  };

  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const dim = daysInMonth(year, month);
  const cells: Array<{ day: number | null; key: string | null }> = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: null, key: null });
  for (let d = 1; d <= dim; d++) {
    cells.push({
      day: d,
      key: formatDateOnly({ year, month, day: d }),
    });
  }

  const selectedItems = selectedDay ? byDay.get(selectedDay) ?? [] : [];
  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{monthLabel}</CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={prev} disabled={pending}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => loadMonth(today.year, today.month)}
            >
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={next} disabled={pending}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, idx) => {
              if (!cell.day || !cell.key) {
                return <div key={`e-${idx}`} className="min-h-[72px] rounded-lg bg-gray-50/50" />;
              }
              const dayItems = byDay.get(cell.key) ?? [];
              const isToday = cell.key === todayKey;
              const isSelected = cell.key === selectedDay;
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelectedDay(cell.key)}
                  className={`min-h-[72px] rounded-lg border p-1.5 text-left transition hover:border-siam-blue/40 ${
                    isSelected
                      ? "border-siam-blue bg-siam-blue/5"
                      : "border-gray-100 dark:border-gray-800"
                  } ${isToday ? "ring-1 ring-siam-blue/40" : ""}`}
                >
                  <div
                    className={`text-xs font-semibold ${
                      isToday ? "text-siam-blue" : "text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    {cell.day}
                  </div>
                  {dayItems.slice(0, 2).map((item) => (
                    <div
                      key={item.id}
                      className="mt-0.5 truncate rounded bg-amber-50 px-1 text-[10px] text-amber-900 dark:bg-amber-900/30 dark:text-amber-100"
                    >
                      {item.title}
                    </div>
                  ))}
                  {dayItems.length > 2 ? (
                    <div className="mt-0.5 text-[10px] text-gray-500">
                      +{dayItems.length - 2} more
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedDay ? formatDisplayDate(selectedDay) : "Select a day"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!selectedDay ? (
            <p className="text-sm text-gray-500">
              Click a date to see follow-ups due that day.
            </p>
          ) : selectedItems.length === 0 ? (
            <p className="text-sm text-gray-500">No follow-ups due this day.</p>
          ) : (
            selectedItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full rounded-lg border border-gray-200 p-3 text-left transition hover:border-siam-blue/40 dark:border-gray-700"
                onClick={() => router.push(`/admin/followups/${item.id}`)}
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {item.title}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {item.client.name ?? item.client.email}
                  {item.service ? ` · ${item.service.name}` : ""}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE_CLASS[item.status]}`}
                  >
                    {FOLLOW_UP_STATUS_LABELS[item.status]}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_BADGE_CLASS[item.priority]}`}
                  >
                    {FOLLOW_UP_PRIORITY_LABELS[item.priority]}
                  </span>
                </div>
              </button>
            ))
          )}
          {selectedDay && selectedItems.length > 0 ? (
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href={`/admin/followups/${selectedItems[0]!.id}`}>
                Open first detail
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

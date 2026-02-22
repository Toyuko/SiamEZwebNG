"use client";

import { useState, useTransition, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { EVENT_COLOR_OPTIONS } from "./eventColors";

type CaseItem = { id: string; caseNumber: string };
type StaffItem = { id: string; name: string | null; email: string };

const fmt = (d: Date) => d.toISOString().slice(0, 16);
const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

export function EventForm({
  action,
  defaultDate,
  defaultStart,
  defaultEnd,
  defaultValues,
  cases,
  staff,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultDate: Date;
  defaultStart?: Date;
  defaultEnd?: Date;
  defaultAllDay?: boolean;
  defaultValues?: {
    title: string;
    description?: string | null;
    start: Date;
    end: Date;
    type: string;
    allDay?: boolean;
    color?: string | null;
    caseId?: string | null;
    userId?: string | null;
    staffId?: string | null;
  };
  cases: CaseItem[];
  staff: StaffItem[];
}) {
  const [pending, startTransition] = useTransition();
  const [allDay, setAllDay] = useState(defaultValues?.allDay ?? defaultAllDay ?? false);

  useEffect(() => {
    if (defaultValues?.allDay !== undefined) setAllDay(defaultValues.allDay);
    else if (defaultAllDay !== undefined) setAllDay(defaultAllDay);
  }, [defaultValues?.allDay, defaultAllDay]);

  const startDefault = defaultValues
    ? fmt(defaultValues.start)
    : defaultStart
      ? fmt(defaultStart)
      : fmt(defaultDate);
  const endDefault = defaultValues
    ? fmt(defaultValues.end)
    : defaultEnd
      ? fmt(defaultEnd)
      : defaultStart
        ? fmt(new Date(defaultStart.getTime() + 60 * 60 * 1000))
        : fmt(new Date(defaultDate.getTime() + 60 * 60 * 1000));

  return (
    <form
      action={(fd) => startTransition(() => action(fd))}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={defaultValues?.title}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={defaultValues?.description ?? ""}
          className="mt-1 flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="allDay"
          name="allDay"
          type="checkbox"
          value="1"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-siam-blue focus:ring-siam-blue"
        />
        <Label htmlFor="allDay">All day</Label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="start">{allDay ? "Start date" : "Start"} *</Label>
          <Input
            id="start"
            name="start"
            type={allDay ? "date" : "datetime-local"}
            required
            defaultValue={
              allDay
                ? fmtDate(
                    defaultValues
                      ? new Date(defaultValues.start)
                      : defaultStart ?? defaultDate
                  )
                : startDefault
            }
            key={allDay ? "date-start" : "datetime-start"}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="end">{allDay ? "End date" : "End"} *</Label>
          <Input
            id="end"
            name="end"
            type={allDay ? "date" : "datetime-local"}
            required
            defaultValue={
              allDay
                ? fmtDate(
                    defaultValues
                      ? new Date(defaultValues.end)
                      : defaultEnd ??
                        (defaultStart
                          ? new Date(defaultStart.getTime() + 86400000)
                          : defaultDate)
                  )
                : endDefault
            }
            key={allDay ? "date-end" : "datetime-end"}
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="type">Type</Label>
        <Select
          id="type"
          name="type"
          defaultValue={defaultValues?.type ?? "appointment"}
          className="mt-1 w-full"
        >
          <option value="appointment">Appointment</option>
          <option value="deadline">Deadline</option>
          <option value="milestone">Milestone</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="color">Color</Label>
        <Select
          id="color"
          name="color"
          defaultValue={defaultValues?.color ?? ""}
          className="mt-1 w-full"
        >
          <option value="">Default (from type)</option>
          {EVENT_COLOR_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="caseId">Case</Label>
        <Select
          id="caseId"
          name="caseId"
          defaultValue={defaultValues?.caseId ?? ""}
          className="mt-1 w-full"
        >
          <option value="">— None —</option>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>{c.caseNumber}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="staffId">Assigned staff</Label>
        <Select
          id="staffId"
          name="staffId"
          defaultValue={defaultValues?.staffId ?? ""}
          className="mt-1 w-full"
        >
          <option value="">— None —</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.name ?? s.email}</option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

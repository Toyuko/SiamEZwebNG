export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type DayHours = {
  closed?: boolean;
  open?: string;
  close?: string;
  breakStart?: string;
  breakEnd?: string;
};

export type HoursJson = {
  days: Partial<Record<Weekday, DayHours>>;
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function emptyHours(): HoursJson {
  return { days: {} };
}

export function parseHoursJson(value: unknown): HoursJson | null {
  if (!value || typeof value !== "object") return null;
  const days = (value as { days?: unknown }).days;
  if (!days || typeof days !== "object") return null;
  const parsed: HoursJson = { days: {} };
  for (const day of WEEKDAYS) {
    const raw = (days as Record<string, unknown>)[day];
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const entry: DayHours = {};
    if (row.closed === true) entry.closed = true;
    for (const key of ["open", "close", "breakStart", "breakEnd"] as const) {
      const time = row[key];
      if (typeof time === "string" && TIME.test(time)) entry[key] = time;
    }
    if (entry.closed || entry.open || entry.close) parsed.days[day] = entry;
  }
  return Object.keys(parsed.days).length ? parsed : null;
}

export function hoursHaveContent(hours: HoursJson | null | undefined): boolean {
  return Boolean(hours && Object.keys(hours.days).length);
}

export function readHoursFromForm(form: FormData): { hours: HoursJson | null; error?: string } {
  const hours = emptyHours();
  for (const day of WEEKDAYS) {
    const closed = form.get(`hours_${day}_closed`) === "on";
    const open = String(form.get(`hours_${day}_open`) ?? "").trim();
    const close = String(form.get(`hours_${day}_close`) ?? "").trim();
    const breakStart = String(form.get(`hours_${day}_break_start`) ?? "").trim();
    const breakEnd = String(form.get(`hours_${day}_break_end`) ?? "").trim();
    if (!closed && !open && !close && !breakStart && !breakEnd) continue;
    for (const time of [open, close, breakStart, breakEnd]) {
      if (time && !TIME.test(time)) {
        return { hours: null, error: `${day} time must use HH:MM` };
      }
    }
    if (!closed && ((open && !close) || (!open && close))) {
      return { hours: null, error: `${day} needs both an opening and closing time` };
    }
    if ((breakStart && !breakEnd) || (!breakStart && breakEnd)) {
      return { hours: null, error: `${day} lunch break needs a start and end` };
    }
    hours.days[day] = {
      ...(closed ? { closed: true } : {}),
      ...(open ? { open } : {}),
      ...(close ? { close } : {}),
      ...(breakStart ? { breakStart } : {}),
      ...(breakEnd ? { breakEnd } : {}),
    };
  }
  return { hours: hoursHaveContent(hours) ? hours : null };
}

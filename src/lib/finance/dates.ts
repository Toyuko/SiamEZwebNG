/**
 * Asia/Bangkok date ranges for financial reporting & analytics.
 */

export type DatePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year"
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "last_180_days"
  | "last_365_days"
  | "custom";

export type DateRange = { start: Date; end: Date };

const BANGKOK = "Asia/Bangkok";

/** Format a Date as YYYY-MM-DD in Asia/Bangkok. */
export function bangkokDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** HH (00–23) in Asia/Bangkok. */
export function bangkokHour(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BANGKOK,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  return h === 24 ? 0 : h;
}

/** Short weekday in Asia/Bangkok (Mon…Sun). */
export function bangkokWeekday(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BANGKOK,
    weekday: "short",
  }).format(d);
}

/** Start of calendar day in Bangkok as UTC Date. */
export function startOfBangkokDay(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00+07:00`);
}

export function endOfBangkokDay(dateKey: string): Date {
  return new Date(`${dateKey}T23:59:59.999+07:00`);
}

function bangkokParts(d: Date): { y: number; m: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BANGKOK,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(d);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { y: get("year"), m: get("month"), day: get("day") };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function addDaysKey(dateKey: string, days: number): string {
  const base = startOfBangkokDay(dateKey);
  const next = new Date(base.getTime() + days * 86_400_000);
  return bangkokDateKey(next);
}

function mondayOffset(weekdayShort: string): number {
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return map[weekdayShort] ?? 0;
}

export function resolveDateRange(
  preset: DatePreset,
  customStart?: string | null,
  customEnd?: string | null,
  now: Date = new Date()
): DateRange {
  const { y, m, day } = bangkokParts(now);
  const todayKey = `${y}-${pad(m)}-${pad(day)}`;

  if (preset === "custom" && customStart && customEnd) {
    return {
      start: startOfBangkokDay(customStart),
      end: endOfBangkokDay(customEnd),
    };
  }

  switch (preset) {
    case "today":
      return { start: startOfBangkokDay(todayKey), end: endOfBangkokDay(todayKey) };
    case "yesterday": {
      const yKey = addDaysKey(todayKey, -1);
      return { start: startOfBangkokDay(yKey), end: endOfBangkokDay(yKey) };
    }
    case "last_7_days":
      return {
        start: startOfBangkokDay(addDaysKey(todayKey, -6)),
        end: endOfBangkokDay(todayKey),
      };
    case "last_30_days":
      return {
        start: startOfBangkokDay(addDaysKey(todayKey, -29)),
        end: endOfBangkokDay(todayKey),
      };
    case "last_90_days":
      return {
        start: startOfBangkokDay(addDaysKey(todayKey, -89)),
        end: endOfBangkokDay(todayKey),
      };
    case "last_180_days":
      return {
        start: startOfBangkokDay(addDaysKey(todayKey, -179)),
        end: endOfBangkokDay(todayKey),
      };
    case "last_365_days":
      return {
        start: startOfBangkokDay(addDaysKey(todayKey, -364)),
        end: endOfBangkokDay(todayKey),
      };
    case "this_week": {
      const offset = mondayOffset(bangkokWeekday(now));
      const weekStart = addDaysKey(todayKey, -offset);
      return {
        start: startOfBangkokDay(weekStart),
        end: endOfBangkokDay(todayKey),
      };
    }
    case "last_week": {
      const offset = mondayOffset(bangkokWeekday(now));
      const thisWeekStart = addDaysKey(todayKey, -offset);
      const lastWeekStart = addDaysKey(thisWeekStart, -7);
      const lastWeekEnd = addDaysKey(thisWeekStart, -1);
      return {
        start: startOfBangkokDay(lastWeekStart),
        end: endOfBangkokDay(lastWeekEnd),
      };
    }
    case "this_month": {
      const startKey = `${y}-${pad(m)}-01`;
      return { start: startOfBangkokDay(startKey), end: endOfBangkokDay(todayKey) };
    }
    case "last_month": {
      const lm = m === 1 ? 12 : m - 1;
      const ly = m === 1 ? y - 1 : y;
      const startKey = `${ly}-${pad(lm)}-01`;
      const nextMonth = lm === 12 ? 1 : lm + 1;
      const nextYear = lm === 12 ? ly + 1 : ly;
      const endOfMonth = new Date(
        new Date(`${nextYear}-${pad(nextMonth)}-01T00:00:00+07:00`).getTime() - 1
      );
      return {
        start: startOfBangkokDay(startKey),
        end: endOfBangkokDay(bangkokDateKey(endOfMonth)),
      };
    }
    case "this_quarter": {
      const qStartMonth = Math.floor((m - 1) / 3) * 3 + 1;
      const startKey = `${y}-${pad(qStartMonth)}-01`;
      return { start: startOfBangkokDay(startKey), end: endOfBangkokDay(todayKey) };
    }
    case "last_quarter": {
      const thisQStart = Math.floor((m - 1) / 3) * 3 + 1;
      let qStart = thisQStart - 3;
      let qy = y;
      if (qStart < 1) {
        qStart += 12;
        qy -= 1;
      }
      const startKey = `${qy}-${pad(qStart)}-01`;
      const endMonth = qStart + 2;
      const nextMonth = endMonth === 12 ? 1 : endMonth + 1;
      const nextYear = endMonth === 12 ? qy + 1 : qy;
      const endOfQ = new Date(
        new Date(`${nextYear}-${pad(nextMonth)}-01T00:00:00+07:00`).getTime() - 1
      );
      return {
        start: startOfBangkokDay(startKey),
        end: endOfBangkokDay(bangkokDateKey(endOfQ)),
      };
    }
    case "this_year": {
      const startKey = `${y}-01-01`;
      return { start: startOfBangkokDay(startKey), end: endOfBangkokDay(todayKey) };
    }
    case "last_year": {
      const startKey = `${y - 1}-01-01`;
      const endKey = `${y - 1}-12-31`;
      return { start: startOfBangkokDay(startKey), end: endOfBangkokDay(endKey) };
    }
    default:
      return {
        start: startOfBangkokDay(addDaysKey(todayKey, -29)),
        end: endOfBangkokDay(todayKey),
      };
  }
}

/**
 * Previous period of equal length ending the day before `range.start`.
 * Used for "Compare with previous period".
 */
export function previousPeriodRange(range: DateRange): DateRange {
  const ms = range.end.getTime() - range.start.getTime();
  const end = new Date(range.start.getTime() - 1);
  const start = new Date(end.getTime() - ms);
  return { start, end };
}

/** Same calendar days shifted back one month (clamped). */
export function previousMonthAlignedRange(range: DateRange): DateRange {
  const startKey = bangkokDateKey(range.start);
  const endKey = bangkokDateKey(range.end);
  const shiftMonth = (key: string): string => {
    const [ys, ms, ds] = key.split("-").map(Number);
    let m = ms! - 1;
    let y = ys!;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    const daysInMonth = bangkokDateKey(
      new Date(new Date(`${y}-${pad(m === 12 ? 1 : m + 1)}-01T00:00:00+07:00`).getTime() - 1)
    ).slice(-2);
    const day = Math.min(ds!, Number(daysInMonth));
    return `${y}-${pad(m)}-${pad(day)}`;
  };
  return {
    start: startOfBangkokDay(shiftMonth(startKey)),
    end: endOfBangkokDay(shiftMonth(endKey)),
  };
}

/** Same dates one year earlier. */
export function previousYearAlignedRange(range: DateRange): DateRange {
  const shift = (key: string): string => {
    const [ys, ms, ds] = key.split("-").map(Number);
    return `${ys! - 1}-${pad(ms!)}-${pad(ds!)}`;
  };
  return {
    start: startOfBangkokDay(shift(bangkokDateKey(range.start))),
    end: endOfBangkokDay(shift(bangkokDateKey(range.end))),
  };
}

/** Inclusive day count in Bangkok calendar days. */
export function bangkokDayCount(range: DateRange): number {
  const start = startOfBangkokDay(bangkokDateKey(range.start)).getTime();
  const end = startOfBangkokDay(bangkokDateKey(range.end)).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

/** Month buckets (YYYY-MM) between start and end inclusive (Bangkok). */
export function monthKeysInRange(start: Date, end: Date): string[] {
  const keys: string[] = [];
  let cursor = bangkokDateKey(start).slice(0, 7);
  const endMonth = bangkokDateKey(end).slice(0, 7);
  while (cursor <= endMonth) {
    keys.push(cursor);
    const [ys, ms] = cursor.split("-").map(Number);
    const nm = ms === 12 ? 1 : ms! + 1;
    const ny = ms === 12 ? ys! + 1 : ys!;
    cursor = `${ny}-${pad(nm!)}`;
  }
  return keys;
}

/** ISO-like week key (YYYY-Www) Monday-based, Bangkok. */
export function bangkokWeekKey(d: Date): string {
  const dateKey = bangkokDateKey(d);
  const offset = mondayOffset(bangkokWeekday(d));
  const monday = addDaysKey(dateKey, -offset);
  const { y } = bangkokParts(startOfBangkokDay(monday));
  // Week number: weeks since first Monday of year
  const jan1 = `${y}-01-01`;
  const jan1Offset = mondayOffset(bangkokWeekday(startOfBangkokDay(jan1)));
  const firstMonday = addDaysKey(jan1, jan1Offset === 0 ? 0 : 7 - jan1Offset);
  const weekNum =
    Math.floor(
      (startOfBangkokDay(monday).getTime() - startOfBangkokDay(firstMonday).getTime()) /
        (7 * 86_400_000)
    ) + 1;
  return `${y}-W${pad(Math.max(1, weekNum))}`;
}

export function bangkokQuarterKey(d: Date): string {
  const { y, m } = bangkokParts(d);
  const q = Math.floor((m - 1) / 3) + 1;
  return `${y}-Q${q}`;
}

export function bangkokYearKey(d: Date): string {
  return String(bangkokParts(d).y);
}

export const DATE_PRESET_LABELS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This week" },
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_quarter", label: "This quarter" },
  { value: "last_quarter", label: "Last quarter" },
  { value: "this_year", label: "This year" },
  { value: "last_year", label: "Last year" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "last_180_days", label: "Last 6 months" },
  { value: "last_365_days", label: "Last 12 months" },
  { value: "custom", label: "Custom range" },
];

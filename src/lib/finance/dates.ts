/**
 * Asia/Bangkok date ranges for financial reporting.
 */

export type DatePreset =
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
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

function addDaysKey(dateKey: string, days: number): string {
  const base = startOfBangkokDay(dateKey);
  const next = new Date(base.getTime() + days * 86_400_000);
  return bangkokDateKey(next);
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
      // Monday-start week in Bangkok
      const weekday = new Intl.DateTimeFormat("en-US", {
        timeZone: BANGKOK,
        weekday: "short",
      }).format(now);
      const map: Record<string, number> = {
        Mon: 0,
        Tue: 1,
        Wed: 2,
        Thu: 3,
        Fri: 4,
        Sat: 5,
        Sun: 6,
      };
      const offset = map[weekday] ?? 0;
      const weekStart = addDaysKey(todayKey, -offset);
      return {
        start: startOfBangkokDay(weekStart),
        end: endOfBangkokDay(todayKey),
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

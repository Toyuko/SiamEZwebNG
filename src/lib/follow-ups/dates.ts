/**
 * Calendar-aware relative date calculations for follow-ups.
 * Uses calendar days/weeks/months — never fixed millisecond offsets.
 * Date-only values use UTC midnight to match Prisma @db.Date.
 */

export type DateParts = { year: number; month: number; day: number };

export type RelativeDateUnit = "DAYS" | "WEEKS" | "MONTHS";
export type RelativeDateDirection = "BEFORE" | "AFTER";

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) throw new Error(`Invalid month: ${month}`);
  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return lengths[month - 1]!;
}

/** Parse YYYY-MM-DD or a Date (UTC date components for @db.Date). */
export function parseDateOnly(input: string | Date): DateParts {
  if (typeof input === "string") {
    const trimmed = input.trim().slice(0, 10);
    const match = DATE_ONLY_RE.exec(trimmed);
    if (!match) throw new Error(`Invalid date: ${input}`);
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
      throw new Error(`Invalid calendar date: ${input}`);
    }
    return { year, month, day };
  }
  return {
    year: input.getUTCFullYear(),
    month: input.getUTCMonth() + 1,
    day: input.getUTCDate(),
  };
}

export function formatDateOnly(parts: DateParts): string {
  const y = String(parts.year).padStart(4, "0");
  const m = String(parts.month).padStart(2, "0");
  const d = String(parts.day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Store as UTC midnight for Prisma @db.Date. */
export function toUtcDateOnly(parts: DateParts): Date {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

export function compareDateOnly(a: DateParts, b: DateParts): number {
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  return 0;
}

/** Today's calendar date in Asia/Bangkok (SiamEZ ops timezone). */
export function todayInBangkok(now: Date = new Date()): DateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return parseDateOnly(formatter.format(now));
}

export function formatDisplayDate(
  input: string | Date | DateParts,
  locale: string = "en-GB"
): string {
  const parts =
    typeof input === "object" && "year" in input ? input : parseDateOnly(input as string | Date);
  const date = toUtcDateOnly(parts);
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function addCalendarDays(parts: DateParts, days: number): DateParts {
  const d = toUtcDateOnly(parts);
  d.setUTCDate(d.getUTCDate() + days);
  return parseDateOnly(d);
}

export function addCalendarWeeks(parts: DateParts, weeks: number): DateParts {
  return addCalendarDays(parts, weeks * 7);
}

/**
 * Add N calendar months, clamping the day to the target month's length
 * (e.g. 31 Jan + 1 month → 28/29 Feb).
 */
export function addCalendarMonths(parts: DateParts, months: number): DateParts {
  const total = parts.year * 12 + (parts.month - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const day = Math.min(parts.day, daysInMonth(year, month));
  return { year, month, day };
}

export function subtractCalendarMonths(parts: DateParts, months: number): DateParts {
  if (months < 0) throw new Error("months must be non-negative");
  return addCalendarMonths(parts, -months);
}

export function addCalendarYears(parts: DateParts, years: number): DateParts {
  const year = parts.year + years;
  const day = Math.min(parts.day, daysInMonth(year, parts.month));
  return { year, month: parts.month, day };
}

/**
 * Apply a relative offset from an anchor date.
 * Examples: 7 days after, 30 days before, 1 month before.
 */
export function applyRelativeDate(input: {
  anchor: string | Date | DateParts;
  value: number;
  unit: RelativeDateUnit;
  direction: RelativeDateDirection;
}): DateParts {
  if (!Number.isFinite(input.value) || input.value < 0) {
    throw new Error("Relative date value must be a non-negative number");
  }
  const anchor =
    typeof input.anchor === "object" && "year" in input.anchor
      ? input.anchor
      : parseDateOnly(input.anchor as string | Date);

  const signed =
    input.direction === "AFTER" ? input.value : input.direction === "BEFORE" ? -input.value : 0;

  switch (input.unit) {
    case "DAYS":
      return addCalendarDays(anchor, signed);
    case "WEEKS":
      return addCalendarWeeks(anchor, signed);
    case "MONTHS":
      return addCalendarMonths(anchor, signed);
    default:
      throw new Error(`Unsupported unit: ${input.unit as string}`);
  }
}

export function startOfWeekBangkok(now: Date = new Date()): DateParts {
  const today = todayInBangkok(now);
  const d = toUtcDateOnly(today);
  const dow = d.getUTCDay(); // 0=Sun
  return addCalendarDays(today, -dow);
}

export function endOfWeekBangkok(now: Date = new Date()): DateParts {
  return addCalendarDays(startOfWeekBangkok(now), 6);
}

export function endOfMonthParts(parts: DateParts): DateParts {
  return { year: parts.year, month: parts.month, day: daysInMonth(parts.year, parts.month) };
}

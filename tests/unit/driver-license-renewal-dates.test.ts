import { describe, expect, it } from "vitest";
import {
  addCalendarYears,
  calculateRenewalDates,
  compareDateOnly,
  daysInMonth,
  formatDateOnly,
  isLeapYear,
  parseDateOnly,
  subtractCalendarMonths,
  toUtcDateOnly,
} from "@/lib/driver-license-renewal/dates";

describe("driver license renewal dates", () => {
  it("calculates 2→5 renewal from issue date when expiry omitted (+5 years)", () => {
    const result = calculateRenewalDates({ issueDate: "2026-09-15" });
    expect(formatDateOnly(result.expiryParts)).toBe("2031-09-15");
    expect(formatDateOnly(result.reminderParts)).toBe("2031-08-15");
    expect(result.nextRenewalDate.toISOString().slice(0, 10)).toBe("2031-09-15");
  });

  it("calculates 5→5 renewal the same way (5-year new license)", () => {
    const result = calculateRenewalDates({
      issueDate: "2026-09-15",
      expiryDate: "2031-09-15",
    });
    expect(formatDateOnly(result.expiryParts)).toBe("2031-09-15");
    expect(formatDateOnly(result.reminderParts)).toBe("2031-08-15");
  });

  it("uses staff-supplied expiry as source of truth (not issue+5)", () => {
    const result = calculateRenewalDates({
      issueDate: "2026-09-15",
      expiryDate: "2030-12-01",
    });
    expect(formatDateOnly(result.expiryParts)).toBe("2030-12-01");
    expect(formatDateOnly(result.reminderParts)).toBe("2030-11-01");
  });

  it("handles leap-year Feb 29 → Feb 28 when adding years to non-leap", () => {
    const parts = addCalendarYears(parseDateOnly("2024-02-29"), 1);
    expect(formatDateOnly(parts)).toBe("2025-02-28");
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2025)).toBe(false);
  });

  it("handles month-end when subtracting one calendar month (Mar 31 → Feb)", () => {
    const feb2025 = subtractCalendarMonths(parseDateOnly("2025-03-31"), 1);
    expect(formatDateOnly(feb2025)).toBe("2025-02-28");
    const feb2024 = subtractCalendarMonths(parseDateOnly("2024-03-31"), 1);
    expect(formatDateOnly(feb2024)).toBe("2024-02-29");
  });

  it("handles Jan 31 minus one month → Dec 31 prior year", () => {
    const result = subtractCalendarMonths(parseDateOnly("2031-01-31"), 1);
    expect(formatDateOnly(result)).toBe("2030-12-31");
  });

  it("rejects invalid calendar dates", () => {
    expect(() => parseDateOnly("2025-02-29")).toThrow();
    expect(() => parseDateOnly("not-a-date")).toThrow();
  });

  it("daysInMonth matches leap years", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2025, 2)).toBe(28);
  });

  it("compareDateOnly orders correctly", () => {
    expect(compareDateOnly(parseDateOnly("2026-01-01"), parseDateOnly("2026-01-02"))).toBe(-1);
    expect(compareDateOnly(parseDateOnly("2026-01-01"), parseDateOnly("2026-01-01"))).toBe(0);
  });

  it("toUtcDateOnly stores midnight UTC", () => {
    const d = toUtcDateOnly(parseDateOnly("2026-09-15"));
    expect(d.toISOString()).toBe("2026-09-15T00:00:00.000Z");
  });
});

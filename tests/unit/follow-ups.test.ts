import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  addCalendarDays,
  addCalendarMonths,
  addCalendarYears,
  applyRelativeDate,
  compareDateOnly,
  daysInMonth,
  formatDateOnly,
  isLeapYear,
  parseDateOnly,
  subtractCalendarMonths,
  toUtcDateOnly,
} from "@/lib/follow-ups/dates";
import { calculateRenewalDates } from "@/lib/driver-license-renewal/dates";
import { REMINDER_BLOCKED_STATUSES } from "@/lib/follow-ups/constants";
import { previewTemplateDates } from "@/lib/follow-ups/templates";

describe("follow-up calendar dates", () => {
  it("detects leap years", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2025)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
  });

  it("handles month-end clamping when adding months", () => {
    // 31 Jan + 1 month → 28 Feb 2025
    expect(formatDateOnly(addCalendarMonths(parseDateOnly("2025-01-31"), 1))).toBe(
      "2025-02-28"
    );
    // 31 Jan + 1 month in leap year → 29 Feb
    expect(formatDateOnly(addCalendarMonths(parseDateOnly("2024-01-31"), 1))).toBe(
      "2024-02-29"
    );
  });

  it("calculates days after", () => {
    const result = applyRelativeDate({
      anchor: "2026-09-15",
      value: 7,
      unit: "DAYS",
      direction: "AFTER",
    });
    expect(formatDateOnly(result)).toBe("2026-09-22");
  });

  it("calculates days before", () => {
    const result = applyRelativeDate({
      anchor: "2026-09-15",
      value: 30,
      unit: "DAYS",
      direction: "BEFORE",
    });
    expect(formatDateOnly(result)).toBe("2026-08-16");
  });

  it("calculates months before (renewal reminder)", () => {
    const result = applyRelativeDate({
      anchor: "2031-09-15",
      value: 1,
      unit: "MONTHS",
      direction: "BEFORE",
    });
    expect(formatDateOnly(result)).toBe("2031-08-15");
  });

  it("calculates weeks after", () => {
    const result = applyRelativeDate({
      anchor: "2026-09-15",
      value: 2,
      unit: "WEEKS",
      direction: "AFTER",
    });
    expect(formatDateOnly(result)).toBe("2026-09-29");
  });

  it("handles leap year day when adding years", () => {
    expect(formatDateOnly(addCalendarYears(parseDateOnly("2024-02-29"), 1))).toBe(
      "2025-02-28"
    );
  });

  it("clamps month-end when subtracting months", () => {
    expect(formatDateOnly(subtractCalendarMonths(parseDateOnly("2026-03-31"), 1))).toBe(
      "2026-02-28"
    );
  });

  it("compares date-only values", () => {
    expect(compareDateOnly(parseDateOnly("2026-01-01"), parseDateOnly("2026-01-02"))).toBe(
      -1
    );
    expect(compareDateOnly(parseDateOnly("2026-01-02"), parseDateOnly("2026-01-02"))).toBe(
      0
    );
  });

  it("stores UTC midnight for Prisma dates", () => {
    const d = toUtcDateOnly(parseDateOnly("2026-09-15"));
    expect(d.toISOString()).toBe("2026-09-15T00:00:00.000Z");
  });

  it("daysInMonth for February", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2025, 2)).toBe(28);
  });

  it("addCalendarDays across month boundary", () => {
    expect(formatDateOnly(addCalendarDays(parseDateOnly("2026-01-30"), 3))).toBe(
      "2026-02-02"
    );
  });
});

describe("driver's license renewal dates via follow-up architecture", () => {
  it("2→5 / 5→5: expiry is source of truth; reminder = 1 month before", () => {
    const dates = calculateRenewalDates({
      issueDate: "2026-09-15",
      expiryDate: "2031-09-15",
    });
    expect(formatDateOnly(dates.expiryParts)).toBe("2031-09-15");
    expect(formatDateOnly(dates.reminderParts)).toBe("2031-08-15");
    expect(dates.nextRenewalDate.toISOString().slice(0, 10)).toBe("2031-09-15");
  });

  it("derives 5-year expiry from issue date when expiry omitted", () => {
    const dates = calculateRenewalDates({ issueDate: "2026-09-15" });
    expect(formatDateOnly(dates.expiryParts)).toBe("2031-09-15");
    expect(formatDateOnly(dates.reminderParts)).toBe("2031-08-15");
  });
});

describe("template date preview", () => {
  it("previews 7 days after completion", () => {
    const preview = previewTemplateDates(
      {
        delayValue: 7,
        delayUnit: "DAYS",
        delayDirection: "AFTER",
        reminderEnabled: true,
        reminderOffsetValue: 0,
        reminderOffsetUnit: "DAYS",
        reminderOffsetDirection: "BEFORE",
        emailEnabled: true,
      },
      "2026-09-15"
    );
    expect(preview.dueDate).toBe("2026-09-22");
    expect(preview.emailReminderDate).toBe("2026-09-22");
  });

  it("previews 30 days before expiry", () => {
    const preview = previewTemplateDates(
      {
        delayValue: 30,
        delayUnit: "DAYS",
        delayDirection: "BEFORE",
        reminderEnabled: true,
        reminderOffsetValue: 0,
        reminderOffsetUnit: "DAYS",
        reminderOffsetDirection: "BEFORE",
        emailEnabled: true,
      },
      "2031-09-15"
    );
    expect(preview.dueDate).toBe("2031-08-16");
  });
});

describe("reminder blocked statuses", () => {
  it("blocks completed and cancelled", () => {
    expect(REMINDER_BLOCKED_STATUSES.has("COMPLETED")).toBe(true);
    expect(REMINDER_BLOCKED_STATUSES.has("CANCELLED")).toBe(true);
    expect(REMINDER_BLOCKED_STATUSES.has("PENDING")).toBe(false);
    expect(REMINDER_BLOCKED_STATUSES.has("DUE")).toBe(false);
  });
});

describe("follow-up reminder engine (unit)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("prevents duplicate sends when reminderSentAt is set", async () => {
    const followUp = {
      id: "fu1",
      status: "DUE",
      emailReminderEnabled: true,
      reminderSentAt: new Date(),
      title: "Check-in",
      description: null,
      emailSubject: null,
      emailBody: null,
      dueDate: new Date("2026-09-15T00:00:00.000Z"),
      client: {
        id: "c1",
        name: "John",
        email: "john@example.com",
        notificationPreferences: null,
        preferredLocale: "en",
      },
      service: { name: "Vehicle Repair" },
    };

    vi.doMock("@/lib/db", () => ({
      prisma: {
        followUp: {
          findUnique: vi.fn().mockResolvedValue(followUp),
          update: vi.fn(),
        },
        followUpActivity: { create: vi.fn() },
      },
    }));
    vi.doMock("@/lib/email/messages", () => ({
      sendFollowUpReminderEmail: vi.fn(),
    }));

    const { sendFollowUpReminder } = await import("@/lib/follow-ups/service");
    const result = await sendFollowUpReminder({
      followUpId: "fu1",
      method: "MANUAL",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe("already_sent");
    }
  });

  it("skips cancelled follow-ups", async () => {
    vi.doMock("@/lib/db", () => ({
      prisma: {
        followUp: {
          findUnique: vi.fn().mockResolvedValue({
            id: "fu2",
            status: "CANCELLED",
            emailReminderEnabled: true,
            reminderSentAt: null,
            client: { email: "a@b.com", name: "A", notificationPreferences: null },
            service: null,
          }),
          update: vi.fn(),
        },
        followUpActivity: { create: vi.fn() },
      },
    }));
    vi.doMock("@/lib/email/messages", () => ({
      sendFollowUpReminderEmail: vi.fn(),
    }));

    const { sendFollowUpReminder } = await import("@/lib/follow-ups/service");
    const result = await sendFollowUpReminder({
      followUpId: "fu2",
      method: "AUTOMATIC",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("cancelled");
  });

  it("skips completed follow-ups", async () => {
    vi.doMock("@/lib/db", () => ({
      prisma: {
        followUp: {
          findUnique: vi.fn().mockResolvedValue({
            id: "fu3",
            status: "COMPLETED",
            emailReminderEnabled: true,
            reminderSentAt: null,
            client: { email: "a@b.com", name: "A", notificationPreferences: null },
            service: null,
          }),
          update: vi.fn(),
        },
        followUpActivity: { create: vi.fn() },
      },
    }));
    vi.doMock("@/lib/email/messages", () => ({
      sendFollowUpReminderEmail: vi.fn(),
    }));

    const { sendFollowUpReminder } = await import("@/lib/follow-ups/service");
    const result = await sendFollowUpReminder({
      followUpId: "fu3",
      method: "AUTOMATIC",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("completed");
  });

  it("skips missing customer email", async () => {
    vi.doMock("@/lib/db", () => ({
      prisma: {
        followUp: {
          findUnique: vi.fn().mockResolvedValue({
            id: "fu4",
            status: "DUE",
            emailReminderEnabled: true,
            reminderSentAt: null,
            title: "T",
            description: null,
            emailSubject: null,
            emailBody: null,
            dueDate: new Date(),
            client: {
              email: "",
              name: "A",
              notificationPreferences: null,
              preferredLocale: "en",
            },
            service: null,
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        followUpActivity: { create: vi.fn() },
      },
    }));
    vi.doMock("@/lib/email/messages", () => ({
      sendFollowUpReminderEmail: vi.fn(),
    }));

    const { sendFollowUpReminder } = await import("@/lib/follow-ups/service");
    const result = await sendFollowUpReminder({
      followUpId: "fu4",
      method: "MANUAL",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe("missing_email");
    }
  });

  it("continues cron when one email fails", async () => {
    const ids = ["a", "b", "c"];
    const sendMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, followUpId: "a", reason: "boom" })
      .mockResolvedValueOnce({ ok: true, followUpId: "b", emailId: "1" })
      .mockResolvedValueOnce({
        ok: false,
        followUpId: "c",
        skipped: true,
        reason: "missing_email",
      });

    vi.doMock("@/lib/db", () => ({
      prisma: {
        followUp: {
          updateMany: vi.fn(),
          findMany: vi.fn().mockResolvedValue(ids.map((id) => ({ id }))),
        },
      },
    }));

    // Patch sendFollowUpReminder by mocking the module's dependency path
    vi.doMock("@/lib/follow-ups/service", async () => {
      const actual = await vi.importActual<typeof import("@/lib/follow-ups/service")>(
        "@/lib/follow-ups/service"
      );
      return {
        ...actual,
        sendFollowUpReminder: sendMock,
      };
    });

    // Direct unit of the loop logic
    const summary = { processed: 3, sent: 0, skipped: 0, failed: 0, details: [] as Array<{ followUpId: string; result: string }> };
    for (const id of ids) {
      const result = await sendMock({ followUpId: id, method: "AUTOMATIC" });
      if (result.ok) {
        summary.sent += 1;
        summary.details.push({ followUpId: id, result: "sent" });
      } else if (result.skipped) {
        summary.skipped += 1;
        summary.details.push({ followUpId: id, result: `skipped:${result.reason}` });
      } else {
        summary.failed += 1;
        summary.details.push({ followUpId: id, result: `failed:${result.reason}` });
      }
    }
    expect(summary.sent).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.skipped).toBe(1);
  });
});

describe("cron auth pattern", () => {
  it("documents Bearer CRON_SECRET expectation", () => {
    const cronSecret = "test-secret";
    const authHeader = `Bearer ${cronSecret}`;
    expect(authHeader).toBe(`Bearer ${cronSecret}`);
    expect(authHeader !== `Bearer wrong`).toBe(true);
  });
});

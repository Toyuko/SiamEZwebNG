import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    driverLicenseRenewal: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    driverLicenseRenewalActivity: {
      create: vi.fn(),
    },
    followUp: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/email/messages", () => ({
  sendDriverLicenseRenewalReminderEmail: vi.fn(),
}));

vi.mock("@/lib/follow-ups/service", () => ({
  createFollowUp: vi.fn(),
  sendFollowUpReminder: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { sendDriverLicenseRenewalReminderEmail } from "@/lib/email/messages";
import { sendFollowUpReminder } from "@/lib/follow-ups/service";
import {
  processDueDriverLicenseReminders,
  sendDriverLicenseReminder,
  sendDriverLicenseTestReminder,
} from "@/lib/driver-license-renewal/service";

const mockedPrisma = prisma as unknown as {
  driverLicenseRenewal: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  driverLicenseRenewalActivity: { create: ReturnType<typeof vi.fn> };
  followUp: { update: ReturnType<typeof vi.fn> };
};

const mockedSendEmail = vi.mocked(sendDriverLicenseRenewalReminderEmail);
const mockedSendFollowUp = vi.mocked(sendFollowUpReminder);

function baseRenewal(overrides: Record<string, unknown> = {}) {
  return {
    id: "ren_1",
    followUpId: null,
    status: "UPCOMING",
    reminderSentAt: null,
    expiryDate: new Date("2031-09-15T00:00:00.000Z"),
    nextRenewalDate: new Date("2031-09-15T00:00:00.000Z"),
    client: {
      id: "u1",
      name: "Alex",
      email: "alex@example.com",
      notificationPreferences: null,
      preferredLocale: "en",
    },
    ...overrides,
  };
}

describe("driver license reminder sending", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.driverLicenseRenewalActivity.create.mockResolvedValue({});
    mockedPrisma.driverLicenseRenewal.update.mockResolvedValue({});
    mockedPrisma.followUp.update.mockResolvedValue({});
  });

  it("sends automatic reminder once and marks REMINDER_SENT", async () => {
    mockedPrisma.driverLicenseRenewal.findUnique.mockResolvedValue(baseRenewal());
    mockedSendEmail.mockResolvedValue({ ok: true, id: "email_1" });

    const first = await sendDriverLicenseReminder({
      renewalId: "ren_1",
      method: "AUTOMATIC",
    });
    expect(first.ok).toBe(true);
    expect(mockedPrisma.driverLicenseRenewal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "REMINDER_SENT",
          reminderSendMethod: "AUTOMATIC",
        }),
      })
    );

    mockedPrisma.driverLicenseRenewal.findUnique.mockResolvedValue(
      baseRenewal({ reminderSentAt: new Date(), status: "REMINDER_SENT" })
    );
    const second = await sendDriverLicenseReminder({
      renewalId: "ren_1",
      method: "AUTOMATIC",
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("already_sent");
  });

  it("does not send for cancelled records", async () => {
    mockedPrisma.driverLicenseRenewal.findUnique.mockResolvedValue(
      baseRenewal({ status: "CANCELLED" })
    );
    const result = await sendDriverLicenseReminder({
      renewalId: "ren_1",
      method: "MANUAL",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("cancelled");
    expect(mockedSendEmail).not.toHaveBeenCalled();
  });

  it("does not send for renewed records", async () => {
    mockedPrisma.driverLicenseRenewal.findUnique.mockResolvedValue(
      baseRenewal({ status: "RENEWED" })
    );
    const result = await sendDriverLicenseReminder({
      renewalId: "ren_1",
      method: "MANUAL",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("renewed");
  });

  it("skips missing email without throwing", async () => {
    mockedPrisma.driverLicenseRenewal.findUnique.mockResolvedValue(
      baseRenewal({ client: { id: "u1", name: "X", email: "", notificationPreferences: null, preferredLocale: "en" } })
    );
    const result = await sendDriverLicenseReminder({
      renewalId: "ren_1",
      method: "AUTOMATIC",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("missing_email");
  });

  it("records MANUAL send method for staff-triggered reminders", async () => {
    mockedPrisma.driverLicenseRenewal.findUnique.mockResolvedValue(baseRenewal());
    mockedSendEmail.mockResolvedValue({ ok: true, id: "email_m" });
    await sendDriverLicenseReminder({
      renewalId: "ren_1",
      method: "MANUAL",
      actorId: "staff_1",
    });
    expect(mockedPrisma.driverLicenseRenewal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reminderSendMethod: "MANUAL",
          reminderSentById: "staff_1",
        }),
      })
    );
  });

  it("test reminder does not set reminderSentAt", async () => {
    mockedPrisma.driverLicenseRenewal.findUnique.mockResolvedValue(baseRenewal());
    mockedSendEmail.mockResolvedValue({ ok: true, id: "email_t" });
    const result = await sendDriverLicenseTestReminder({ renewalId: "ren_1", actorId: "staff_1" });
    expect(result.ok).toBe(true);
    expect(mockedPrisma.driverLicenseRenewal.update).not.toHaveBeenCalled();
    expect(mockedSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ isTest: true })
    );
  });

  it("uses linked FollowUp path when followUpId is set", async () => {
    mockedPrisma.driverLicenseRenewal.findUnique.mockResolvedValue(
      baseRenewal({ followUpId: "fu_1" })
    );
    mockedSendFollowUp.mockResolvedValue({ ok: true, followUpId: "fu_1", emailId: "e2" });
    const result = await sendDriverLicenseReminder({
      renewalId: "ren_1",
      method: "AUTOMATIC",
    });
    expect(result.ok).toBe(true);
    expect(mockedSendFollowUp).toHaveBeenCalled();
    expect(mockedSendEmail).not.toHaveBeenCalled();
  });

  it("cron continues after one failure", async () => {
    mockedPrisma.driverLicenseRenewal.findMany.mockResolvedValue([
      { id: "ren_fail" },
      { id: "ren_ok" },
    ]);
    mockedPrisma.driverLicenseRenewal.updateMany.mockResolvedValue({ count: 0 });

    mockedPrisma.driverLicenseRenewal.findUnique
      .mockResolvedValueOnce(baseRenewal({ id: "ren_fail" }))
      .mockResolvedValueOnce(baseRenewal({ id: "ren_ok" }));

    mockedSendEmail
      .mockResolvedValueOnce({ ok: false, error: "provider_down" })
      .mockResolvedValueOnce({ ok: true, id: "email_ok" });

    const summary = await processDueDriverLicenseReminders(
      new Date("2031-08-15T05:00:00.000Z")
    );
    expect(summary.processed).toBe(2);
    expect(summary.failed).toBe(1);
    expect(summary.sent).toBe(1);
  });
});

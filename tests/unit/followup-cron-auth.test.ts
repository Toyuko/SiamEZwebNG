import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

describe("followup-reminders cron auth", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it("rejects missing CRON_SECRET configuration", async () => {
    delete process.env.CRON_SECRET;
    vi.doMock("@/lib/follow-ups/service", () => ({
      processDueFollowUpReminders: vi.fn(),
    }));
    vi.doMock("@/lib/driver-license-renewal/service", () => ({
      processDueDriverLicenseReminders: vi.fn(),
    }));
    vi.doMock("@/lib/follow-ups/queries", () => ({
      syncOverdueStatuses: vi.fn(),
    }));

    const { GET } = await import("@/app/api/cron/followup-reminders/route");
    const req = new Request("http://localhost/api/cron/followup-reminders", {
      headers: { authorization: "Bearer anything" },
    });
    const res = await GET(req as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/CRON_SECRET/);
  });

  it("rejects unauthorized bearer token", async () => {
    process.env.CRON_SECRET = "correct-secret";
    vi.doMock("@/lib/follow-ups/service", () => ({
      processDueFollowUpReminders: vi.fn(),
    }));
    vi.doMock("@/lib/driver-license-renewal/service", () => ({
      processDueDriverLicenseReminders: vi.fn(),
    }));
    vi.doMock("@/lib/follow-ups/queries", () => ({
      syncOverdueStatuses: vi.fn(),
    }));

    const { GET } = await import("@/app/api/cron/followup-reminders/route");
    const req = new Request("http://localhost/api/cron/followup-reminders", {
      headers: { authorization: "Bearer wrong" },
    });
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it("runs when authorized", async () => {
    process.env.CRON_SECRET = "correct-secret";
    const processDue = vi.fn().mockResolvedValue({
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      details: [],
    });
    vi.doMock("@/lib/follow-ups/service", () => ({
      processDueFollowUpReminders: processDue,
    }));
    vi.doMock("@/lib/driver-license-renewal/service", () => ({
      processDueDriverLicenseReminders: vi.fn().mockResolvedValue({
        processed: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        details: [],
      }),
    }));
    vi.doMock("@/lib/follow-ups/queries", () => ({
      syncOverdueStatuses: vi.fn(),
    }));

    const { GET } = await import("@/app/api/cron/followup-reminders/route");
    const req = new Request("http://localhost/api/cron/followup-reminders", {
      headers: { authorization: "Bearer correct-secret" },
    });
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(processDue).toHaveBeenCalled();
  });
});

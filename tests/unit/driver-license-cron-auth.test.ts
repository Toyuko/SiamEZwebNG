import { afterEach, describe, expect, it, vi } from "vitest";

describe("driver-license-reminders cron auth", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("rejects missing CRON_SECRET configuration", async () => {
    vi.stubEnv("CRON_SECRET", "");
    delete process.env.CRON_SECRET;

    const { GET } = await import("@/app/api/cron/driver-license-reminders/route");
    const res = await GET(
      new Request("http://localhost/api/cron/driver-license-reminders") as never
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/CRON_SECRET/);
  });

  it("rejects unauthorized bearer token", async () => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    process.env.CRON_SECRET = "test-secret";

    const { GET } = await import("@/app/api/cron/driver-license-reminders/route");
    const res = await GET(
      new Request("http://localhost/api/cron/driver-license-reminders", {
        headers: { authorization: "Bearer wrong" },
      }) as never
    );
    expect(res.status).toBe(401);
  });
});

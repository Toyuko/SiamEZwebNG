import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    driverLicenseRenewal: {
      findMany: vi.fn(),
    },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMyDriverLicenseRenewals } from "@/actions/driver-license-renewals";

describe("customer access to driver license renewals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("customers only query their own clientId", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: "cust_1", email: "c@example.com", name: "C", role: "customer" },
      expires: "2099-01-01",
    } as never);

    vi.mocked(prisma.driverLicenseRenewal.findMany).mockResolvedValue([]);

    await getMyDriverLicenseRenewals();

    expect(prisma.driverLicenseRenewal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: "cust_1" }),
      })
    );
  });

  it("non-customers get an empty list", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: "staff_1", email: "s@example.com", name: "S", role: "staff" },
      expires: "2099-01-01",
    } as never);

    const rows = await getMyDriverLicenseRenewals();
    expect(rows).toEqual([]);
    expect(prisma.driverLicenseRenewal.findMany).not.toHaveBeenCalled();
  });

  it("unauthenticated throws", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    await expect(getMyDriverLicenseRenewals()).rejects.toThrow("Unauthorized");
  });
});

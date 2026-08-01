import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";
import {
  getSession,
  requireAuth,
  requireCompany,
  requireFreelancer,
  requireRole,
  requireStaff,
  type Session,
} from "@/lib/auth";

const mockedAuth = vi.mocked(auth);

function sessionFor(role: Session["user"]["role"]): Session {
  return {
    user: {
      id: `id_${role}`,
      email: `${role}@example.com`,
      name: role,
      role,
    },
    expires: "2099-01-01T00:00:00.000Z",
  };
}

describe("auth guards", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
  });

  it("getSession returns null when unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null as never);
    await expect(getSession()).resolves.toBeNull();
  });

  it("requireAuth throws Unauthorized without a session", async () => {
    mockedAuth.mockResolvedValue(null as never);
    await expect(requireAuth()).rejects.toThrow("Unauthorized");
  });

  it("requireAuth returns the session when authenticated", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "u1", email: "a@b.com", name: "A", role: "customer" },
      expires: "2099-01-01T00:00:00.000Z",
    } as never);
    const session = await requireAuth();
    expect(session.user.id).toBe("u1");
    expect(session.user.role).toBe("customer");
  });

  it("requireStaff allows admin and staff only", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "a1", email: "admin@siamez.com", name: "Admin", role: "admin" },
      expires: "2099-01-01T00:00:00.000Z",
    } as never);
    await expect(requireStaff()).resolves.toMatchObject({ user: { role: "admin" } });

    mockedAuth.mockResolvedValue({
      user: { id: "s1", email: "staff@siamez.com", name: "Staff", role: "staff" },
      expires: "2099-01-01T00:00:00.000Z",
    } as never);
    await expect(requireStaff()).resolves.toMatchObject({ user: { role: "staff" } });
  });

  it("requireStaff forbids portal roles", async () => {
    for (const role of ["customer", "freelancer", "company"] as const) {
      mockedAuth.mockResolvedValue({
        user: { id: `id_${role}`, email: `${role}@example.com`, name: role, role },
        expires: "2099-01-01T00:00:00.000Z",
      } as never);
      await expect(requireStaff()).rejects.toThrow("Forbidden");
    }
  });

  it("requireFreelancer and requireCompany enforce role", async () => {
    mockedAuth.mockResolvedValue({
      user: {
        id: "f1",
        email: "freelancer@example.com",
        name: "F",
        role: "freelancer",
      },
      expires: "2099-01-01T00:00:00.000Z",
    } as never);
    await expect(requireFreelancer()).resolves.toMatchObject({
      user: { role: "freelancer" },
    });
    await expect(requireCompany()).rejects.toThrow("Forbidden");

    mockedAuth.mockResolvedValue({
      user: {
        id: "c1",
        email: "company@example.com",
        name: "C",
        role: "company",
      },
      expires: "2099-01-01T00:00:00.000Z",
    } as never);
    await expect(requireCompany()).resolves.toMatchObject({
      user: { role: "company" },
    });
    await expect(requireFreelancer()).rejects.toThrow("Forbidden");
  });

  it("requireRole builds a predicate for allowed roles", () => {
    const isStaffish = requireRole(["admin", "staff"]);
    expect(isStaffish(sessionFor("admin"))).toBe(true);
    expect(isStaffish(sessionFor("staff"))).toBe(true);
    expect(isStaffish(sessionFor("customer"))).toBe(false);

    const isCustomer = requireRole("customer");
    expect(isCustomer(sessionFor("customer"))).toBe(true);
    expect(isCustomer(sessionFor("admin"))).toBe(false);
  });
});

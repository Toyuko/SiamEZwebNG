import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth/api-jwt", () => ({
  verifyApiJwt: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { verifyApiJwt } from "@/lib/auth/api-jwt";
import { prisma } from "@/lib/db";
import { getApiUser } from "@/lib/auth/getApiUser";
import { resolveApiUserId } from "@/lib/auth/resolveApiUserId";
import { auth } from "@/auth";

const mockedVerify = vi.mocked(verifyApiJwt);
const mockedFindUser = vi.mocked(prisma.user.findUnique);
const mockedAuth = vi.mocked(auth);

function requestWith(headers: Record<string, string>): NextRequest {
  return {
    headers: {
      get(name: string) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
  } as NextRequest;
}

describe("getApiUser", () => {
  beforeEach(() => {
    mockedVerify.mockReset();
    mockedFindUser.mockReset();
  });

  it("uses cached x-api-user-id without JWT verification", async () => {
    const user = await getApiUser(
      requestWith({ "x-api-user-id": "cached_user" })
    );
    expect(user).toEqual({ userId: "cached_user" });
    expect(mockedVerify).not.toHaveBeenCalled();
  });

  it("rejects missing or empty Bearer tokens", async () => {
    await expect(getApiUser(requestWith({}))).rejects.toThrow("Unauthorized");
    await expect(
      getApiUser(requestWith({ authorization: "Bearer " }))
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects inactive users after JWT verify", async () => {
    mockedVerify.mockResolvedValue({
      userId: "u1",
      email: "a@b.com",
      role: "customer",
    });
    mockedFindUser.mockResolvedValue({ id: "u1", active: false } as never);

    await expect(
      getApiUser(requestWith({ authorization: "Bearer good.token.value" }))
    ).rejects.toThrow("Unauthorized");
  });

  it("returns userId for active JWT users", async () => {
    mockedVerify.mockResolvedValue({
      userId: "u1",
      email: "a@b.com",
      role: "customer",
    });
    mockedFindUser.mockResolvedValue({ id: "u1", active: true } as never);

    await expect(
      getApiUser(requestWith({ authorization: "Bearer good.token.value" }))
    ).resolves.toEqual({ userId: "u1" });
  });
});

describe("resolveApiUserId", () => {
  beforeEach(() => {
    mockedVerify.mockReset();
    mockedFindUser.mockReset();
    mockedAuth.mockReset();
  });

  it("returns null when Bearer JWT auth fails", async () => {
    mockedVerify.mockRejectedValue(new Error("Invalid token"));
    const id = await resolveApiUserId(
      requestWith({ authorization: "Bearer bad.token" })
    );
    expect(id).toBeNull();
  });

  it("falls back to web session when no Bearer token", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "session_user" },
    } as never);
    const id = await resolveApiUserId(requestWith({}));
    expect(id).toBe("session_user");
  });
});

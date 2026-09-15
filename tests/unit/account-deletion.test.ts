import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  checkRateLimit,
  resetRateLimitBucketsForTests,
} from "@/lib/security/rate-limit";
import {
  isValidDeletionEmail,
  normalizeDeletionEmail,
  hashClientIp,
} from "@/lib/account-deletion/service";
import {
  ACCOUNT_DELETION_CONFIRM_PHRASE,
  ACCOUNT_DELETION_GENERIC_ACK,
  getAccountDeletionProcessingDays,
} from "@/config/account-deletion";

describe("account deletion helpers", () => {
  it("normalizes and validates emails", () => {
    expect(normalizeDeletionEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
    expect(isValidDeletionEmail("a@b.co")).toBe(true);
    expect(isValidDeletionEmail("not-an-email")).toBe(false);
    expect(isValidDeletionEmail("")).toBe(false);
  });

  it("hashes client IPs without returning raw IP", () => {
    const h = hashClientIp("203.0.113.10");
    expect(h).toHaveLength(32);
    expect(h).not.toContain("203");
  });

  it("uses configurable processing days with safe default", () => {
    const prev = process.env.ACCOUNT_DELETION_PROCESSING_DAYS;
    delete process.env.ACCOUNT_DELETION_PROCESSING_DAYS;
    expect(getAccountDeletionProcessingDays()).toBe(30);
    process.env.ACCOUNT_DELETION_PROCESSING_DAYS = "14";
    expect(getAccountDeletionProcessingDays()).toBe(14);
    process.env.ACCOUNT_DELETION_PROCESSING_DAYS = "999";
    expect(getAccountDeletionProcessingDays()).toBe(30);
    if (prev === undefined) delete process.env.ACCOUNT_DELETION_PROCESSING_DAYS;
    else process.env.ACCOUNT_DELETION_PROCESSING_DAYS = prev;
  });

  it("exposes stable confirmation phrase and generic ack", () => {
    expect(ACCOUNT_DELETION_CONFIRM_PHRASE).toContain("Delete my SiamEZ account permanently");
    expect(ACCOUNT_DELETION_GENERIC_ACK.toLowerCase()).toContain("if an account");
  });
});

describe("account deletion request rate limit", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests();
  });

  it("blocks after limit for deletion-request key", () => {
    expect(checkRateLimit("account-deletion-request:1.1.1.1", 5, 3600_000).allowed).toBe(true);
    for (let i = 0; i < 4; i += 1) {
      expect(checkRateLimit("account-deletion-request:1.1.1.1", 5, 3600_000).allowed).toBe(true);
    }
    expect(checkRateLimit("account-deletion-request:1.1.1.1", 5, 3600_000).allowed).toBe(false);
  });
});

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    accountDeletionRequest: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    accountDeletionAuditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/email/messages", () => ({
  sendAccountDeletionRequestReceivedEmail: vi.fn(async () => ({ skipped: true })),
  sendAccountDeletionCompletedEmail: vi.fn(async () => ({ skipped: true })),
  sendAccountDeletionOpsAlert: vi.fn(async () => ({ skipped: true })),
}));

describe("submitAccountDeletionRequest enumeration safety", () => {
  it("returns the same generic message whether or not a user exists", async () => {
    const { prisma } = await import("@/lib/db");
    const { submitAccountDeletionRequest } = await import("@/lib/account-deletion/service");

    const mockedPrisma = prisma as unknown as {
      user: { findUnique: ReturnType<typeof vi.fn> };
      accountDeletionRequest: {
        findFirst: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
      };
      accountDeletionAuditLog: { create: ReturnType<typeof vi.fn> };
    };

    mockedPrisma.accountDeletionRequest.findFirst.mockResolvedValue(null);
    mockedPrisma.accountDeletionRequest.create.mockResolvedValue({
      id: "req_1",
      email: "missing@example.com",
    });
    mockedPrisma.accountDeletionAuditLog.create.mockResolvedValue({});
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    const missing = await submitAccountDeletionRequest({
      email: "missing@example.com",
      confirmed: true,
      locale: "en",
      source: "PUBLIC",
    });

    mockedPrisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      role: "customer",
      active: true,
    });
    mockedPrisma.accountDeletionRequest.create.mockResolvedValue({
      id: "req_2",
      email: "exists@example.com",
    });

    const exists = await submitAccountDeletionRequest({
      email: "exists@example.com",
      confirmed: true,
      locale: "en",
      source: "PUBLIC",
    });

    expect(missing.ok).toBe(true);
    expect(exists.ok).toBe(true);
    if (missing.ok && exists.ok) {
      expect(missing.message).toBe(exists.message);
      expect(missing.message).toBe(ACCOUNT_DELETION_GENERIC_ACK);
    }
  });

  it("rejects invalid email and missing confirmation", async () => {
    const { submitAccountDeletionRequest } = await import("@/lib/account-deletion/service");
    const badEmail = await submitAccountDeletionRequest({
      email: "nope",
      confirmed: true,
    });
    const noConfirm = await submitAccountDeletionRequest({
      email: "a@b.co",
      confirmed: false,
    });
    expect(badEmail.ok).toBe(false);
    expect(noConfirm.ok).toBe(false);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    service: { findUnique: vi.fn() },
    document: { updateMany: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/data-access/case", () => ({
  createCase: vi.fn(),
}));

vi.mock("@/data-access/invoice", () => ({
  createInvoice: vi.fn(),
}));

vi.mock("@/lib/domain/marketplace-jobs", () => ({
  createMarketplaceJobForCase: vi.fn(),
  notifyFreelancers: vi.fn(),
}));

vi.mock("@/lib/email/messages", () => ({
  sendBookingConfirmationEmail: vi.fn(),
  sendAdminNewBookingEmail: vi.fn(),
}));

vi.mock("@/lib/utils", () => ({
  nextCaseNumber: vi.fn(() => "CASE-TEST-001"),
}));

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { createCase } from "@/data-access/case";
import { createBookingCase } from "@/lib/domain/cases";
import { submitBooking } from "@/actions/booking";
import { getSession } from "@/lib/auth";

const findUnique = vi.mocked(prisma.service.findUnique);
const userFindUnique = vi.mocked(prisma.user.findUnique);
const createCaseMock = vi.mocked(createCase);
const updateMany = vi.mocked(prisma.document.updateMany);
const getSessionMock = vi.mocked(getSession);

describe("createBookingCase guards", () => {
  beforeEach(() => {
    findUnique.mockReset();
    userFindUnique.mockReset();
    createCaseMock.mockReset();
    updateMany.mockReset();
    updateMany.mockResolvedValue({ count: 0 } as never);
    userFindUnique.mockResolvedValue({
      email: "user@example.com",
      name: "User",
    } as never);
  });

  it("rejects inactive or missing services", async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      createBookingCase({
        serviceId: "svc_missing",
        isGuest: true,
        guestEmail: "guest@example.com",
      })
    ).rejects.toThrow("Service not found or inactive");

    findUnique.mockResolvedValue({
      id: "svc_1",
      active: false,
      type: "fixed",
      priceAmount: 500,
    } as never);
    await expect(
      createBookingCase({
        serviceId: "svc_1",
        isGuest: true,
        guestEmail: "guest@example.com",
      })
    ).rejects.toThrow("Service not found or inactive");
  });

  it("requires userId for logged-in bookings", async () => {
    findUnique.mockResolvedValue({
      id: "svc_1",
      active: true,
      type: "quote",
      priceAmount: null,
    } as never);

    await expect(
      createBookingCase({
        serviceId: "svc_1",
        isGuest: false,
      })
    ).rejects.toThrow("User ID required for logged-in booking");
  });

  it("requires guest email for guest bookings", async () => {
    findUnique.mockResolvedValue({
      id: "svc_1",
      active: true,
      type: "quote",
      priceAmount: null,
    } as never);

    await expect(
      createBookingCase({
        serviceId: "svc_1",
        isGuest: true,
        guestEmail: "   ",
      })
    ).rejects.toThrow("Guest email required");
  });

  it("creates a guest quote case when inputs are valid", async () => {
    findUnique.mockResolvedValue({
      id: "svc_1",
      active: true,
      type: "quote",
      priceAmount: null,
    } as never);
    createCaseMock.mockResolvedValue({
      id: "case_1",
      caseNumber: "CASE-TEST-001",
    } as never);

    const result = await createBookingCase({
      serviceId: "svc_1",
      isGuest: true,
      guestEmail: "guest@example.com",
      guestName: "Guest",
      formData: { note: "hello" },
    });

    expect(result.caseId).toBe("case_1");
    expect(result.caseNumber).toBe("CASE-TEST-001");
    expect(result.isFixed).toBe(false);
    expect(result.guestCheckoutToken).toEqual(expect.any(String));
    expect(createCaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceId: "svc_1",
        isGuest: true,
        guestEmail: "guest@example.com",
        userId: null,
        status: "under_review",
      })
    );
  });

  it("only attaches documents owned by the booking user", async () => {
    findUnique.mockResolvedValue({
      id: "svc_1",
      active: true,
      type: "quote",
      priceAmount: null,
    } as never);
    createCaseMock.mockResolvedValue({
      id: "case_1",
      caseNumber: "CASE-TEST-001",
    } as never);
    updateMany.mockResolvedValue({ count: 1 } as never);

    await createBookingCase({
      serviceId: "svc_1",
      isGuest: false,
      userId: "user_1",
      documentIds: ["doc_a", "doc_b"],
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["doc_a", "doc_b"] },
        uploadedBy: "user_1",
      },
      data: { caseId: "case_1" },
    });
  });

  it("does not attach documents for guest bookings", async () => {
    findUnique.mockResolvedValue({
      id: "svc_1",
      active: true,
      type: "quote",
      priceAmount: null,
    } as never);
    createCaseMock.mockResolvedValue({
      id: "case_1",
      caseNumber: "CASE-TEST-001",
    } as never);

    await createBookingCase({
      serviceId: "svc_1",
      isGuest: true,
      guestEmail: "guest@example.com",
      documentIds: ["doc_stolen"],
    });

    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe("submitBooking", () => {
  beforeEach(() => {
    findUnique.mockReset();
    createCaseMock.mockReset();
    getSessionMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("maps domain failures to success:false without throwing", async () => {
    getSessionMock.mockResolvedValue(null);
    findUnique.mockResolvedValue(null);

    const result = await submitBooking({
      serviceId: "missing",
      serviceSlug: "marriage-registration",
      isGuest: true,
      guestEmail: "guest@example.com",
      formData: {},
    });

    expect(result).toEqual({
      success: false,
      error: "Service not found or inactive",
    });
  });

  it("binds logged-in bookings to the session user, ignoring client userId", async () => {
    getSessionMock.mockResolvedValue({
      user: { id: "session_user", email: "a@b.com", name: "A", role: "customer" },
      expires: "2099-01-01T00:00:00.000Z",
    });
    findUnique.mockResolvedValue({
      id: "svc_1",
      active: true,
      type: "fixed",
      priceAmount: 0,
    } as never);
    createCaseMock.mockResolvedValue({
      id: "case_9",
      caseNumber: "CASE-TEST-001",
    } as never);

    const result = await submitBooking({
      serviceId: "svc_1",
      serviceSlug: "basic-translation",
      isGuest: false,
      userId: "attacker_user",
      formData: { pages: 2 },
    });

    expect(result.success).toBe(true);
    expect(createCaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "session_user",
        isGuest: false,
      })
    );
  });

  it("treats unauthenticated callers as guests even if client sends userId", async () => {
    getSessionMock.mockResolvedValue(null);
    findUnique.mockResolvedValue({
      id: "svc_1",
      active: true,
      type: "quote",
      priceAmount: null,
    } as never);
    createCaseMock.mockResolvedValue({
      id: "case_g",
      caseNumber: "CASE-TEST-001",
    } as never);

    const result = await submitBooking({
      serviceId: "svc_1",
      serviceSlug: "marriage-registration",
      isGuest: false,
      userId: "spoofed",
      guestEmail: "guest@example.com",
      formData: {},
    });

    expect(result.success).toBe(true);
    expect(createCaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isGuest: true,
        userId: null,
        guestEmail: "guest@example.com",
      })
    );
  });
});

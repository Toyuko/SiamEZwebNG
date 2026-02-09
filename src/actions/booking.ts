"use server";

import { prisma } from "@/lib/db";
import { createCase } from "@/data-access/case";
import { nextCaseNumber } from "@/lib/utils";
import type { CaseStatus } from "@prisma/client";

export interface SubmitBookingInput {
  serviceId: string;
  serviceSlug: string;
  isGuest: boolean;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
  userId?: string;
  formData: Record<string, unknown>;
  documentIds?: string[];
}

export interface SubmitBookingResult {
  success: boolean;
  caseId?: string;
  caseNumber?: string;
  error?: string;
}

/**
 * Creates a Case from a booking submission.
 * For fixed-price: caller should create Payment/Stripe PI separately and then update case status.
 * For quote-based: case stays "new" until admin sends quote.
 */
export async function submitBooking(input: SubmitBookingInput): Promise<SubmitBookingResult> {
  try {
    const service = await prisma.service.findUnique({
      where: { id: input.serviceId },
    });
    if (!service || !service.active) {
      return { success: false, error: "Service not found or inactive" };
    }

    const userId = input.isGuest ? undefined : input.userId;
    if (!userId && input.isGuest) {
      if (!input.guestEmail?.trim()) return { success: false, error: "Guest email required" };
    }
    if (!userId && !input.isGuest) {
      return { success: false, error: "User ID required for logged-in booking" };
    }

    // For guest bookings we need a system user or allow null; schema currently requires userId.
    // Option A: create a "guest" user per booking. Option B: make userId optional in Case.
    // We'll use a placeholder: require either userId or create guest user. For now require userId for DB.
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      // Create a minimal guest user for this booking (or use a single "guest" system user)
      const guest = await prisma.user.upsert({
        where: { email: input.guestEmail!.toLowerCase() },
        create: {
          email: input.guestEmail!.toLowerCase(),
          name: input.guestName ?? "Guest",
          phone: input.guestPhone ?? undefined,
          role: "customer",
          passwordHash: "",
        },
        update: {},
      });
      resolvedUserId = guest.id;
    }

    const caseNumber = nextCaseNumber();
    const status: CaseStatus = service.type === "fixed" ? "new" : "new";

    const c = await createCase({
      caseNumber,
      userId: resolvedUserId,
      serviceId: input.serviceId,
      status,
      guestEmail: input.guestEmail ?? null,
      guestName: input.guestName ?? null,
      guestPhone: input.guestPhone ?? null,
      formData: input.formData as object,
    });

    if (input.documentIds?.length) {
      await prisma.document.updateMany({
        where: { id: { in: input.documentIds } },
        data: { caseId: c.id },
      });
    }

    return { success: true, caseId: c.id, caseNumber: c.caseNumber };
  } catch (e) {
    console.error("submitBooking error", e);
    return { success: false, error: e instanceof Error ? e.message : "Booking failed" };
  }
}

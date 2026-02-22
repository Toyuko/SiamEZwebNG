"use server";

import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { createCase } from "@/data-access/case";
import { createInvoice } from "@/data-access/invoice";
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
  isFixed?: boolean;
  /** For guest checkout – secure token to access checkout page */
  guestCheckoutToken?: string;
  error?: string;
}

/**
 * Creates a Case from a booking submission.
 * Supports both guest and logged-in user bookings.
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
    if (!userId && !input.isGuest) {
      return { success: false, error: "User ID required for logged-in booking" };
    }
    if (input.isGuest && !input.guestEmail?.trim()) {
      return { success: false, error: "Guest email required" };
    }

    const caseNumber = nextCaseNumber();
    const status: CaseStatus = service.type === "fixed" ? "new" : "under_review";

    let guestCheckoutToken: string | undefined;
    if (input.isGuest) {
      guestCheckoutToken = randomBytes(32).toString("hex");
    }

    const c = await createCase({
      caseNumber,
      userId: userId ?? null,
      serviceId: input.serviceId,
      status,
      isGuest: input.isGuest,
      guestCheckoutToken: guestCheckoutToken ?? null,
      guestEmail: input.guestEmail?.trim() || null,
      guestName: input.guestName?.trim() || null,
      guestPhone: input.guestPhone?.trim() || null,
      formData: input.formData as object,
    });

    if (input.documentIds?.length) {
      await prisma.document.updateMany({
        where: { id: { in: input.documentIds } },
        data: { caseId: c.id },
      });
    }

    if (service.type === "fixed" && service.priceAmount != null && service.priceAmount > 0) {
      await createInvoice({
        caseId: c.id,
        userId: userId ?? null,
        amount: service.priceAmount,
        currency: service.priceCurrency ?? "THB",
        status: "unpaid",
      });
    }

    return {
      success: true,
      caseId: c.id,
      caseNumber: c.caseNumber,
      isFixed: service.type === "fixed",
      guestCheckoutToken,
    };
  } catch (e) {
    console.error("submitBooking error", e);
    return { success: false, error: e instanceof Error ? e.message : "Booking failed" };
  }
}

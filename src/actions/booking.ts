"use server";

import { createBookingCase } from "@/lib/domain/cases";

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
    const result = await createBookingCase({
      serviceId: input.serviceId,
      isGuest: input.isGuest,
      userId: input.userId,
      guestEmail: input.guestEmail,
      guestName: input.guestName,
      guestPhone: input.guestPhone,
      formData: input.formData,
      documentIds: input.documentIds,
    });

    return {
      success: true,
      caseId: result.caseId,
      caseNumber: result.caseNumber,
      isFixed: result.isFixed,
      guestCheckoutToken: result.guestCheckoutToken,
    };
  } catch (e) {
    console.error("submitBooking error", e);
    return { success: false, error: e instanceof Error ? e.message : "Booking failed" };
  }
}

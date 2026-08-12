"use server";

import { createBookingCase } from "@/lib/domain/cases";
import { getSession } from "@/lib/auth";

export interface SubmitBookingInput {
  serviceId: string;
  serviceSlug: string;
  isGuest: boolean;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
  /** Ignored — session identity is authoritative when logged in. */
  userId?: string;
  formData: Record<string, unknown>;
  documentIds?: string[];
  postToMarketplace?: boolean;
  /** Accepted smart-quote id (server validates amount). */
  quoteId?: string;
  guestQuoteToken?: string;
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
 * Logged-in users are always bound to the session userId (client userId ignored).
 * Guests require guestEmail.
 */
export async function submitBooking(input: SubmitBookingInput): Promise<SubmitBookingResult> {
  try {
    const session = await getSession();
    const sessionUserId = session?.user?.id;
    // Session is authoritative. Client-supplied userId / isGuest are ignored.
    const isGuest = !sessionUserId;

    const result = await createBookingCase({
      serviceId: input.serviceId,
      isGuest,
      userId: sessionUserId,
      guestEmail: input.guestEmail,
      guestName: input.guestName,
      guestPhone: input.guestPhone,
      formData: input.formData,
      documentIds: input.documentIds,
      postToMarketplace: input.postToMarketplace,
      quoteId: input.quoteId,
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

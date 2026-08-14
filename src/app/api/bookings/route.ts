import { NextRequest } from "next/server";
import { createBookingCase } from "@/lib/domain/cases";
import { getOrEnsureServiceBySlug, getServiceById } from "@/data-access/service";
import { ok, fail } from "@/lib/api-response";
import { optionalBearerApiUser } from "@/lib/auth/requireBearerApiUser";
import {
  checkRateLimit,
  clientKeyFromRequest,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

/**
 * POST /api/bookings
 * Create a booking case.
 * - Authenticated: always attributes to the JWT user (client userId ignored).
 * - Unauthenticated: guest booking only (requires guestEmail).
 */
export async function POST(request: NextRequest) {
  const rl = checkRateLimit(clientKeyFromRequest(request, "bookings"), 20, 60_000);
  if (!rl.allowed) {
    return rateLimitResponse(rl.retryAfterSec);
  }

  try {
    const apiUser = await optionalBearerApiUser(request);
    const body = await request.json();
    // Accept either a service id (cuid) or a canonical slug (e.g. "translation-services").
    // Mirrors the website booking page, which resolves the slug via getOrEnsureServiceBySlug.
    const serviceRef = String(body?.serviceId ?? body?.serviceSlug ?? "").trim();

    if (!serviceRef) {
      return fail("serviceId is required", 400);
    }

    const service =
      (await getServiceById(serviceRef).catch(() => null)) ??
      (await getOrEnsureServiceBySlug(serviceRef));
    if (!service || !service.active) {
      return fail("Service not found or inactive", 404);
    }

    const isAuthenticated = Boolean(apiUser?.userId);
    const result = await createBookingCase({
      serviceId: service.id,
      isGuest: !isAuthenticated,
      userId: isAuthenticated ? apiUser!.userId : undefined,
      guestEmail: typeof body?.guestEmail === "string" ? body.guestEmail : undefined,
      guestName: typeof body?.guestName === "string" ? body.guestName : undefined,
      guestPhone: typeof body?.guestPhone === "string" ? body.guestPhone : undefined,
      formData: body?.formData ?? {},
      documentIds: Array.isArray(body?.documentIds) ? body.documentIds : undefined,
      postToMarketplace: Boolean(body?.postToMarketplace),
    });

    return ok(result, 201);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create booking", 500);
  }
}

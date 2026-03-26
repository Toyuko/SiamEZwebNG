import { NextRequest } from "next/server";
import { createBookingCase } from "@/lib/domain/cases";
import { ok, fail } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const serviceId = String(body?.serviceId ?? "").trim();
    const isGuest = Boolean(body?.isGuest ?? true);

    if (!serviceId) {
      return fail("serviceId is required", 400);
    }

    const result = await createBookingCase({
      serviceId,
      isGuest,
      userId: typeof body?.userId === "string" ? body.userId : undefined,
      guestEmail: typeof body?.guestEmail === "string" ? body.guestEmail : undefined,
      guestName: typeof body?.guestName === "string" ? body.guestName : undefined,
      guestPhone: typeof body?.guestPhone === "string" ? body.guestPhone : undefined,
      formData: body?.formData ?? {},
      documentIds: Array.isArray(body?.documentIds) ? body.documentIds : undefined,
    });

    return ok(result, 201);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create booking", 500);
  }
}

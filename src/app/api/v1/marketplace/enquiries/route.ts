import { NextRequest } from "next/server";
import {
  createListingEnquiry,
  listMyListingEnquiries,
  parseListingEnquiryType,
} from "@/data-access/listing-enquiries";
import {
  apiBadRequest,
  apiOk,
  serializeJson,
  withBearerUser,
  withOptionalBearerUser,
} from "@/lib/api/v1/helpers";

/** GET /api/v1/marketplace/enquiries — seller inbox */
export async function GET(request: NextRequest) {
  return withBearerUser(request, async (userId) => {
    const rows = await listMyListingEnquiries(userId);
    return apiOk(serializeJson(rows));
  });
}

/** POST /api/v1/marketplace/enquiries — contact seller */
export async function POST(request: NextRequest) {
  return withOptionalBearerUser(request, async (userId) => {
    const body = (await request.json().catch(() => null)) as {
      listingType?: string;
      listingId?: string;
      name?: string;
      email?: string;
      phone?: string | null;
      message?: string;
    } | null;

    const listingType = parseListingEnquiryType(String(body?.listingType ?? ""));
    const listingId =
      typeof body?.listingId === "string" ? body.listingId.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";

    if (!listingType || !listingId || !name || !email || !message) {
      return apiBadRequest(
        "listingType, listingId, name, email, and message are required"
      );
    }

    const enquiry = await createListingEnquiry({
      listingType,
      listingId,
      userId,
      name,
      email,
      phone: body?.phone ?? null,
      message,
    });
    return apiOk(serializeJson(enquiry), 201);
  });
}

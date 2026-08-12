"use server";

import { getSession, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createListingEnquiry,
  getListingOwnerId,
  listMyListingEnquiries,
  markListingEnquiryRead,
  parseListingEnquiryType,
} from "@/data-access/listing-enquiries";
import {
  PUBLIC_REAL_ESTATE_INVENTORY_STATUSES,
} from "@/data-access/real-estate";
import { PUBLIC_SALES_INVENTORY_STATUSES } from "@/data-access/sales";
import { sendListingEnquiryEmail } from "@/lib/email/messages";
import { parseNotificationPreferences } from "@/lib/notification-preferences";

export type CreateListingEnquiryInput = {
  listingType: string;
  listingId: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
};

async function listingIsPublic(
  listingType: "vehicle" | "property",
  listingId: string
): Promise<boolean> {
  if (listingType === "vehicle") {
    const row = await prisma.salesVehicle.findFirst({
      where: {
        id: listingId,
        published: true,
        status: { in: PUBLIC_SALES_INVENTORY_STATUSES },
      },
      select: { id: true },
    });
    return Boolean(row);
  }
  const row = await prisma.salesProperty.findFirst({
    where: {
      id: listingId,
      published: true,
      status: { in: PUBLIC_REAL_ESTATE_INVENTORY_STATUSES },
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function createEnquiryAction(
  input: CreateListingEnquiryInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const listingType = parseListingEnquiryType(input.listingType);
  const listingId = input.listingId?.trim();
  const name = input.name?.trim();
  const email = input.email?.trim();
  const message = input.message?.trim();

  if (!listingType || !listingId) {
    return { ok: false, error: "invalid_listing" };
  }
  if (!name || name.length < 2) {
    return { ok: false, error: "invalid_name" };
  }
  if (!email || !email.includes("@")) {
    return { ok: false, error: "invalid_email" };
  }
  if (!message || message.length < 10) {
    return { ok: false, error: "invalid_message" };
  }

  const isPublic = await listingIsPublic(listingType, listingId);
  if (!isPublic) {
    return { ok: false, error: "listing_unavailable" };
  }

  const session = await getSession();

  try {
    await createListingEnquiry({
      listingType,
      listingId,
      userId: session?.user.id ?? null,
      name,
      email,
      phone: input.phone?.trim() || null,
      message,
    });

    const ownerId = await getListingOwnerId(listingType, listingId);
    if (ownerId) {
      const owner = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { email: true, name: true, notificationPreferences: true },
      });
      const prefs = parseNotificationPreferences(owner?.notificationPreferences);
      if (owner?.email && prefs.emailCaseUpdates) {
        let listingTitle = `${listingType} listing`;
        if (listingType === "vehicle") {
          const v = await prisma.salesVehicle.findUnique({
            where: { id: listingId },
            select: { title: true, make: true, model: true, year: true },
          });
          if (v) listingTitle = v.title || `${v.year} ${v.make} ${v.model}`;
        } else {
          const p = await prisma.salesProperty.findUnique({
            where: { id: listingId },
            select: { title: true },
          });
          if (p?.title) listingTitle = p.title;
        }

        sendListingEnquiryEmail({
          ownerEmail: owner.email,
          ownerName: owner.name,
          listingType,
          listingTitle,
          fromName: name,
          fromEmail: email,
          fromPhone: input.phone?.trim() || null,
          message,
        });
      }
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "submit_failed" };
  }
}

export async function listMyListingEnquiriesAction() {
  const session = await requireAuth();
  return listMyListingEnquiries(session.user.id);
}

export async function markListingEnquiryReadAction(
  enquiryId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireAuth();
  const isStaff =
    session.user.role === "admin" || session.user.role === "staff";

  const updated = await markListingEnquiryRead(
    enquiryId.trim(),
    session.user.id,
    isStaff
  );

  if (!updated) {
    return { ok: false, error: "forbidden" };
  }
  return { ok: true };
}

/** Used by tests / authorization helpers. */
export async function verifySellerOwnsEnquiryListing(
  listingType: string,
  listingId: string,
  sellerUserId: string
): Promise<boolean> {
  const parsed = parseListingEnquiryType(listingType);
  if (!parsed) return false;
  const ownerId = await getListingOwnerId(parsed, listingId);
  return ownerId === sellerUserId;
}

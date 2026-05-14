"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession, requireAuth } from "@/lib/auth";
import { createOmisePromptPayCharge } from "@/lib/omise";
import { boostDaysFromTier, getSalesBoostPackage } from "@/lib/sales-boost-packages";
import { notifyAdminSalesBoostPending } from "@/lib/sales-boost-notify";
import * as documentDA from "@/data-access/document";
import { applySalesBoostAfterPayment, applySalesSuperBoostForListing } from "@/data-access/sales";

const salesVehicleIdSchema = z.string().cuid();
const packageIdSchema = z.enum(["1w", "2w", "4w"]);

function isBoostWindowActive(row: { isBoosted: boolean; boostExpiresAt: Date | null }) {
  if (!row.isBoosted || !row.boostExpiresAt) return false;
  return row.boostExpiresAt > new Date();
}

export async function startOmiseSalesBoostCharge(input: { salesVehicleId: string; packageId: string }) {
  const session = await requireAuth();
  const salesVehicleId = salesVehicleIdSchema.parse(input.salesVehicleId);
  const packageId = packageIdSchema.parse(input.packageId);
  const pkg = getSalesBoostPackage(packageId);
  if (!pkg) return { success: false as const, error: "Invalid package" };

  const vehicle = await prisma.salesVehicle.findUnique({
    where: { id: salesVehicleId },
    select: {
      id: true,
      createdById: true,
      published: true,
      status: true,
      isBoosted: true,
      boostExpiresAt: true,
    },
  });
  if (!vehicle || !vehicle.published) return { success: false as const, error: "Listing not found" };
  if (vehicle.createdById !== session.user.id) {
    return { success: false as const, error: "You can only boost your own listings" };
  }
  if (vehicle.status === "pending_boost") {
    return { success: false as const, error: "Boost payment is already pending review" };
  }
  if (vehicle.status === "sold") return { success: false as const, error: "Sold listings cannot be boosted" };
  if (isBoostWindowActive(vehicle)) return { success: false as const, error: "This listing is already boosted" };

  const omise = await createOmisePromptPayCharge({
    amountThb: pkg.priceThb,
    description: `SiamEZ listing boost (${pkg.id})`,
    metadata: {
      type: "sales_boost",
      sales_vehicle_id: salesVehicleId,
      boost_days: String(pkg.days),
      boost_tier: pkg.id,
    },
  });
  if (!omise.ok) return { success: false as const, error: omise.error };

  await prisma.salesVehicle.update({
    where: { id: salesVehicleId },
    data: {
      omiseChargeId: omise.chargeId,
      boostTier: pkg.id,
    },
  });

  return {
    success: true as const,
    chargeId: omise.chargeId,
    qrImageUrl: omise.qrImageUrl,
    authorizeUri: omise.authorizeUri,
  };
}

export async function submitSalesBoostBankTransfer(input: {
  salesVehicleId: string;
  packageId: string;
  proofDocumentId: string;
}) {
  const session = await requireAuth();
  const salesVehicleId = salesVehicleIdSchema.parse(input.salesVehicleId);
  const packageId = packageIdSchema.parse(input.packageId);
  const proofDocumentId = z.string().cuid().parse(input.proofDocumentId);
  const pkg = getSalesBoostPackage(packageId);
  if (!pkg) return { success: false as const, error: "Invalid package" };

  const vehicle = await prisma.salesVehicle.findUnique({
    where: { id: salesVehicleId },
    select: {
      id: true,
      make: true,
      model: true,
      year: true,
      createdById: true,
      published: true,
      status: true,
      isBoosted: true,
      boostExpiresAt: true,
    },
  });
  if (!vehicle || !vehicle.published) return { success: false as const, error: "Listing not found" };
  if (vehicle.createdById !== session.user.id) {
    return { success: false as const, error: "You can only boost your own listings" };
  }
  if (vehicle.status === "pending_boost") {
    return { success: false as const, error: "Boost payment is already pending review" };
  }
  if (vehicle.status === "sold") return { success: false as const, error: "Sold listings cannot be boosted" };
  if (isBoostWindowActive(vehicle)) return { success: false as const, error: "This listing is already boosted" };

  const doc = await documentDA.getDocumentById(proofDocumentId);
  if (!doc || doc.uploadedBy !== session.user.id) {
    return { success: false as const, error: "Invalid payment slip upload" };
  }
  if (doc.documentType !== "sales_boost_bank_slip") {
    return { success: false as const, error: "Invalid document type" };
  }

  await prisma.salesVehicle.update({
    where: { id: salesVehicleId },
    data: {
      status: "pending_boost",
      boostTier: pkg.id,
      boostProofDocumentId: proofDocumentId,
      isBoosted: false,
      omiseChargeId: null,
    },
  });

  void notifyAdminSalesBoostPending({
    vehicleId: salesVehicleId,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    boostTier: pkg.id,
    priceThb: pkg.priceThb,
  });

  return { success: true as const };
}

/** Staff: approve bank-transfer boost after verifying the slip. */
export async function approvePendingSalesBoost(salesVehicleId: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (session.user.role !== "admin" && session.user.role !== "staff") {
    return { success: false as const, error: "Forbidden" };
  }
  const id = salesVehicleIdSchema.parse(salesVehicleId);
  const vehicle = await prisma.salesVehicle.findUnique({
    where: { id },
    select: { status: true, boostTier: true },
  });
  if (!vehicle || vehicle.status !== "pending_boost") {
    return { success: false as const, error: "No pending boost for this listing" };
  }
  const days = boostDaysFromTier(vehicle.boostTier);
  await applySalesBoostAfterPayment(id, {
    days,
    tier: vehicle.boostTier,
    clearOmiseCharge: true,
  });
  return { success: true as const };
}

/**
 * Staff: applies a fixed 30-day boost (legacy Stripe tooling).
 * Omise + bank flows use `startOmiseSalesBoostCharge`, `submitSalesBoostBankTransfer`, and `approvePendingSalesBoost`.
 */
export async function handleBoostPayment(salesVehicleId: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  if (session.user.role !== "admin" && session.user.role !== "staff") {
    throw new Error("Forbidden");
  }

  const id = salesVehicleIdSchema.parse(salesVehicleId);
  await applySalesSuperBoostForListing(id);
  return { ok: true as const };
}

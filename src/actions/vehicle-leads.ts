"use server";

import { revalidatePath } from "next/cache";
import type { VehicleLeadStatus, VehicleSocialPlatform } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { VEHICLE_LEAD_STATUSES } from "@/config/vehicle-intake";
import {
  getVehicleLeadById,
  getVehicleLeadStats,
  listVehicleLeads,
  newReferralTokenValue,
  type VehicleLeadListFilters,
} from "@/data-access/vehicle-leads";
import { convertVehicleLeadToBooking } from "@/lib/vehicle-leads/submit";
import { generateCustomerDraft } from "@/lib/vehicle-leads/analyze";
import { generateVehicleMarketingPackage } from "@/lib/vehicle-leads/generate-marketing";
import { buildSoldPost, type MarketingLanguage } from "@/lib/vehicle-leads/marketing";
import {
  getVehicleServicePricing,
  saveVehicleServicePricing,
  type VehicleServicePricing,
} from "@/lib/vehicle-leads/pricing";
import { Prisma } from "@prisma/client";

function revalidateLead(id: string) {
  revalidatePath("/admin/vehicle-leads");
  revalidatePath(`/admin/vehicle-leads/${id}`);
}

export async function getAdminVehicleLeads(filters: VehicleLeadListFilters = {}) {
  await requireStaff();
  const [leads, stats] = await Promise.all([listVehicleLeads(filters), getVehicleLeadStats()]);
  return { leads, stats };
}

export async function getAdminVehicleLead(id: string) {
  await requireStaff();
  return getVehicleLeadById(id);
}

export async function updateVehicleLeadStatusAction(leadId: string, status: VehicleLeadStatus) {
  const session = await requireStaff();
  if (!VEHICLE_LEAD_STATUSES.includes(status)) throw new Error("Invalid status");
  const existing = await prisma.vehicleLead.findUnique({ where: { id: leadId } });
  if (!existing) throw new Error("Lead not found");

  const socialStatus =
    status === "sold_or_purchased" || status === "completed"
      ? ("sold" as const)
      : undefined;

  await prisma.vehicleLead.update({
    where: { id: leadId },
    data: {
      status,
      ...(socialStatus ? { socialStatus } : {}),
      statusHistory: {
        create: {
          fromStatus: existing.status,
          toStatus: status,
          changedById: session.user.id,
        },
      },
    },
  });
  revalidateLead(leadId);
}

export async function assignVehicleLeadAction(leadId: string, staffId: string | null) {
  await requireStaff();
  await prisma.vehicleLead.update({
    where: { id: leadId },
    data: { assignedStaffId: staffId },
  });
  revalidateLead(leadId);
}

export async function addVehicleLeadNoteAction(leadId: string, content: string) {
  const session = await requireStaff();
  const text = content.trim();
  if (!text) throw new Error("Note is required");
  await prisma.vehicleLeadNote.create({
    data: { leadId, userId: session.user.id, content: text },
  });
  await prisma.vehicleLead.update({
    where: { id: leadId },
    data: { notes: text },
  });
  revalidateLead(leadId);
}

export async function setOfficialListingPriceAction(leadId: string, price: number | null) {
  await requireStaff();
  if (price != null && (!Number.isFinite(price) || price < 0)) throw new Error("Invalid price");
  await prisma.vehicleLead.update({
    where: { id: leadId },
    data: { officialListingPrice: price },
  });
  revalidateLead(leadId);
}

export async function convertVehicleLeadAction(leadId: string) {
  const session = await requireStaff();
  const created = await convertVehicleLeadToBooking(leadId, session.user.id);
  revalidateLead(leadId);
  revalidatePath("/admin/cases");
  return { caseId: created.id, caseNumber: created.caseNumber };
}

export async function generateCustomerResponseAction(leadId: string, locale: "en" | "th" = "en") {
  await requireStaff();
  const lead = await prisma.vehicleLead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found");
  const draft = await generateCustomerDraft({
    type: lead.type,
    displayTitle: lead.displayTitle,
    locale,
  });
  await prisma.vehicleLead.update({
    where: { id: leadId },
    data: { aiCustomerDraft: draft },
  });
  revalidateLead(leadId);
  return draft;
}

export async function saveCustomerResponseAction(leadId: string, draft: string) {
  await requireStaff();
  await prisma.vehicleLead.update({
    where: { id: leadId },
    data: { aiCustomerDraft: draft },
  });
  revalidateLead(leadId);
}

export async function generateMarketingPackageAction(leadId: string, language: MarketingLanguage) {
  const session = await requireStaff();
  const lead = await prisma.vehicleLead.findUnique({
    where: { id: leadId },
    include: { vehicle: true, media: true },
  });
  if (!lead || !lead.vehicle) throw new Error("Lead not found");

  const pkg = await generateVehicleMarketingPackage({
    language,
    facts: {
      kind: lead.vehicle.kind,
      make: lead.vehicle.make,
      model: lead.vehicle.model,
      year: lead.vehicle.year,
      variant: lead.vehicle.variant,
      engineSize: lead.vehicle.engineSize,
      transmission: lead.vehicle.transmission,
      fuel: lead.vehicle.fuel,
      mileageKm: lead.vehicle.mileageKm,
      colour: lead.vehicle.colour,
      province: lead.vehicle.province ?? lead.province,
      city: lead.vehicle.city ?? lead.city,
      overallCondition: lead.vehicle.overallCondition,
      accidentHistory: lead.vehicle.accidentHistory,
      floodDamage: lead.vehicle.floodDamage,
      modifications: lead.vehicle.modifications,
      serviceHistory: lead.vehicle.serviceHistory,
      officialListingPrice: lead.officialListingPrice,
      askingPrice: lead.askingPrice,
    },
    media: lead.media.map((m) => ({
      id: m.id,
      category: m.category,
      isPrivate: m.isPrivate,
      mediaType: m.mediaType,
    })),
  });

  const row = await prisma.vehicleSocialContent.create({
    data: {
      leadId,
      language: language === "both" ? "both" : language,
      status: "ready_for_review",
      packageJson: pkg as unknown as Prisma.InputJsonValue,
    },
  });
  await prisma.vehicleLead.update({
    where: { id: leadId },
    data: { socialStatus: "ready_for_review" },
  });
  void session;
  revalidateLead(leadId);
  return row.id;
}

export async function saveMarketingPackageAction(
  contentId: string,
  packageJson: Prisma.InputJsonValue
) {
  await requireStaff();
  const row = await prisma.vehicleSocialContent.update({
    where: { id: contentId },
    data: { packageJson, status: "ready_for_review" },
  });
  revalidateLead(row.leadId);
}

export async function approveMarketingPackageAction(contentId: string) {
  const session = await requireStaff();
  const row = await prisma.vehicleSocialContent.update({
    where: { id: contentId },
    data: {
      status: "approved",
      approvedAt: new Date(),
      approvedById: session.user.id,
    },
  });
  await prisma.vehicleLead.update({
    where: { id: row.leadId },
    data: { socialStatus: "approved" },
  });
  revalidateLead(row.leadId);
}

export async function recordSocialPostAction(input: {
  leadId: string;
  platform: VehicleSocialPlatform;
  postUrl?: string;
  campaign?: string;
  notes?: string;
}) {
  const session = await requireStaff();
  await prisma.vehicleSocialPost.create({
    data: {
      leadId: input.leadId,
      platform: input.platform,
      postedAt: new Date(),
      postUrl: input.postUrl?.trim() || null,
      campaign: input.campaign?.trim() || null,
      notes: input.notes?.trim() || null,
      staffId: session.user.id,
    },
  });
  await prisma.vehicleLead.update({
    where: { id: input.leadId },
    data: { socialStatus: "posted" },
  });
  revalidateLead(input.leadId);
}

export async function generateSoldPostAction(leadId: string, language: MarketingLanguage) {
  await requireStaff();
  const lead = await prisma.vehicleLead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found");
  return buildSoldPost({ title: lead.displayTitle, language });
}

export async function createVehicleShareTokenAction(campaign?: string) {
  const session = await requireStaff();
  const token = await prisma.vehicleLeadReferralToken.create({
    data: {
      token: newReferralTokenValue(),
      staffId: session.user.id,
      campaign: campaign?.trim() || null,
    },
  });
  return token.token;
}

export async function getAdminVehiclePricing(): Promise<VehicleServicePricing> {
  await requireStaff();
  return getVehicleServicePricing();
}

export async function saveAdminVehiclePricing(input: VehicleServicePricing) {
  await requireStaff();
  await saveVehicleServicePricing(input);
  revalidatePath("/admin/settings");
  return { success: true as const };
}

export async function getStaffOptionsForVehicleLeads() {
  await requireStaff();
  return prisma.user.findMany({
    where: { role: { in: ["admin", "staff"] }, active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

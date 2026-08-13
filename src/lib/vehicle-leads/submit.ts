import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { PRIVATE_MEDIA_CATEGORIES, VEHICLE_FINDER_SERVICE_SLUG } from "@/config/vehicle-intake";
import { trackPlatformEvent } from "@/lib/analytics/track";
import { getOrEnsureServiceBySlug } from "@/data-access/service";
import { createCase as createCaseRecord } from "@/data-access/case";
import { createDocument } from "@/data-access/document";
import { createInvoice } from "@/data-access/invoice";
import { nextCaseNumber } from "@/lib/utils";
import {
  createVehicleLeadRecord,
  findRecentDuplicate,
  newPublicToken,
  nextVehicleLeadNumber,
} from "@/data-access/vehicle-leads";
import { analyzeVehicleLead, generateCustomerDraft } from "@/lib/vehicle-leads/analyze";
import { blankToNull, buildDisplayTitle, resolveMake } from "@/lib/vehicle-leads/display";
import { getVehicleServicePricing } from "@/lib/vehicle-leads/pricing";
import type { SubmitVehicleLeadInput } from "@/lib/vehicle-leads/schema";
import type { Prisma } from "@prisma/client";

function vehicleCreateData(input: SubmitVehicleLeadInput): Prisma.VehicleCreateWithoutLeadInput {
  const make = resolveMake(input.vehicle.make, input.vehicle.makeOther);
  if (input.type === "sell") {
    const v = input.vehicle;
    return {
      kind: v.kind,
      make,
      model: blankToNull(v.model),
      transmission: blankToNull(v.transmission),
      fuel: blankToNull(v.fuel),
      province: blankToNull(v.province),
      city: blankToNull(v.city),
      year: v.year,
      variant: blankToNull(v.variant),
      engineSize: blankToNull(v.engineSize),
      mileageKm: v.mileageKm ?? null,
      colour: blankToNull(v.colour),
      overallCondition: blankToNull(v.overallCondition),
      accidentHistory: blankToNull(v.accidentHistory),
      floodDamage: blankToNull(v.floodDamage),
      majorRepairs: blankToNull(v.majorRepairs),
      engineCondition: blankToNull(v.engineCondition),
      transmissionCondition: blankToNull(v.transmissionCondition),
      tireCondition: blankToNull(v.tireCondition),
      modifications: blankToNull(v.modifications),
      knownProblems: blankToNull(v.knownProblems),
      serviceHistory: blankToNull(v.serviceHistory),
      registeredOwner: blankToNull(v.registeredOwner),
      ownershipStatus: blankToNull(v.ownershipStatus),
      greenBookAvailable: v.greenBookAvailable ?? null,
      blueBookAvailable: v.blueBookAvailable ?? null,
      registrationProvince: blankToNull(v.registrationProvince),
      taxStatus: blankToNull(v.taxStatus),
      insuranceStatus: blankToNull(v.insuranceStatus),
      outstandingFinance: blankToNull(v.outstandingFinance),
      restrictions: blankToNull(v.restrictions),
      priceNegotiable: v.priceNegotiable ?? null,
      sellTimeline: blankToNull(v.sellTimeline),
      reasonForSelling: blankToNull(v.reasonForSelling),
      acceptRecommendedPrice: v.acceptRecommendedPrice ?? null,
    };
  }

  const v = input.vehicle;
  return {
    kind: v.kind,
    make,
    model: blankToNull(v.model),
    transmission: blankToNull(v.transmission),
    fuel: blankToNull(v.fuel),
    province: blankToNull(v.province),
    city: blankToNull(v.city),
    yearMin: v.yearMin ?? null,
    yearMax: v.yearMax ?? null,
    budgetMin: v.budgetMin ?? null,
    budgetMax: v.budgetMax ?? null,
    maxMileageKm: v.maxMileageKm ?? null,
    newOrUsed: blankToNull(v.newOrUsed),
    preferredColour: blankToNull(v.preferredColour),
    mustHaveFeatures: blankToNull(v.mustHaveFeatures),
    dealBreakers: blankToNull(v.dealBreakers),
    purchasePayment: blankToNull(v.purchasePayment),
    purchaseTimeframe: blankToNull(v.purchaseTimeframe),
    needDelivery: v.needDelivery ?? null,
    needTransfer: v.needTransfer ?? null,
    needInsurance: v.needInsurance ?? null,
    needInspection: v.needInspection ?? null,
    needFinancingHelp: v.needFinancingHelp ?? null,
  };
}

export async function submitVehicleLead(input: SubmitVehicleLeadInput) {
  const displayTitle = buildDisplayTitle(input);
  const duplicate = await findRecentDuplicate({
    type: input.type,
    customerPhone: blankToNull(input.contact.customerPhone),
    customerEmail: blankToNull(input.contact.customerEmail),
    displayTitle,
  });
  if (duplicate) {
    return { ok: true as const, duplicate: true as const, leadNumber: duplicate };
  }

  let assignedStaffId: string | null = null;
  let referralTokenId: string | null = null;
  if (input.ref?.trim()) {
    const token = await prisma.vehicleLeadReferralToken.findUnique({
      where: { token: input.ref.trim() },
    });
    if (token && (!token.expiresAt || token.expiresAt > new Date())) {
      assignedStaffId = token.staffId;
      referralTokenId = token.id;
    }
  }

  const leadNumber = await nextVehicleLeadNumber();
  const publicToken = newPublicToken();
  const photoCount = input.media.filter((m) => m.mediaType === "image").length;
  const pricing = await getVehicleServicePricing();

  const vehicleRecord = vehicleCreateData(input);
  const analysis = await analyzeVehicleLead({
    type: input.type,
    displayTitle,
    vehicle: vehicleRecord as Record<string, unknown>,
    askingPrice: input.type === "sell" ? input.vehicle.askingPrice ?? null : null,
    budgetMin: input.type === "buy" ? input.vehicle.budgetMin ?? null : null,
    budgetMax: input.type === "buy" ? input.vehicle.budgetMax ?? null : null,
    photoCount,
    hasContact: Boolean(input.contact.customerPhone?.trim() || input.contact.customerLineId?.trim()),
    pricing,
  });

  const draft = await generateCustomerDraft({
    type: input.type,
    displayTitle,
    locale: input.locale === "th" ? "th" : "en",
  });

  const lead = await createVehicleLeadRecord({
    leadNumber,
    publicToken,
    type: input.type,
    status: "new",
    source: blankToNull(input.source) ?? "website",
    utmSource: blankToNull(input.utmSource),
    utmMedium: blankToNull(input.utmMedium),
    utmCampaign: blankToNull(input.utmCampaign),
    locale: input.locale ?? "en",
    customerName: input.contact.customerName.trim(),
    customerPhone: blankToNull(input.contact.customerPhone),
    customerLineId: blankToNull(input.contact.customerLineId),
    customerEmail: blankToNull(input.contact.customerEmail),
    preferredContactMethod: blankToNull(input.contact.preferredContactMethod),
    preferredContactTime: blankToNull(input.contact.preferredContactTime),
    customerLocation: blankToNull(input.contact.customerLocation),
    vehicleKind: input.vehicle.kind,
    displayTitle,
    province: blankToNull(input.vehicle.province),
    city: blankToNull("city" in input.vehicle ? input.vehicle.city : undefined),
    askingPrice: input.type === "sell" ? input.vehicle.askingPrice ?? null : null,
    budgetMin: input.type === "buy" ? input.vehicle.budgetMin ?? null : null,
    budgetMax: input.type === "buy" ? input.vehicle.budgetMax ?? null : null,
    aiEstimatedMin: analysis.estimatedMarketMin,
    aiEstimatedMax: analysis.estimatedMarketMax,
    aiSuggestedPrice: analysis.suggestedListingPrice,
    aiMinAcceptablePrice: analysis.suggestedMinAcceptable,
    aiSummary: analysis.vehicleSummary,
    aiLeadScore: analysis.leadQualityScore,
    aiAnalysis: analysis as unknown as Prisma.InputJsonValue,
    aiCustomerDraft: draft,
    assignedStaff: assignedStaffId ? { connect: { id: assignedStaffId } } : undefined,
    referralToken: referralTokenId ? { connect: { id: referralTokenId } } : undefined,
    vehicle: { create: vehicleRecord },
    statusHistory: {
      create: { toStatus: "new", note: "Lead submitted" },
    },
    media: {
      create: input.media.map((m) => ({
        mediaType: m.mediaType,
        category: m.category,
        name: m.name,
        storageKey: m.storageKey,
        mimeType: m.mimeType,
        size: m.size,
        isPrivate: PRIVATE_MEDIA_CATEGORIES.has(m.category) || m.mediaType === "document",
      })),
    },
  });

  void trackPlatformEvent("vehicle_lead_submitted", {
    leadId: lead.id,
    type: input.type,
    source: lead.source,
    score: analysis.leadQualityScore,
  }, undefined, input.locale);

  return { ok: true as const, duplicate: false as const, lead, analysis };
}

export async function convertVehicleLeadToBooking(leadId: string, staffUserId: string) {
  const lead = await prisma.vehicleLead.findUnique({
    where: { id: leadId },
    include: { vehicle: true, media: true },
  });
  if (!lead) throw new Error("Lead not found");
  if (lead.caseId) {
    const existing = await prisma.case.findUnique({
      where: { id: lead.caseId },
      select: { id: true, caseNumber: true },
    });
    if (existing) return existing;
  }

  const service = await getOrEnsureServiceBySlug(VEHICLE_FINDER_SERVICE_SLUG);
  if (!service) throw new Error("Vehicle service is not available");

  const formData = {
    name: lead.customerName,
    email: lead.customerEmail,
    phone: lead.customerPhone,
    lineId: lead.customerLineId,
    location: lead.customerLocation ?? lead.province,
    notes: lead.notes,
    vehicleLeadId: lead.id,
    vehicleLeadNumber: lead.leadNumber,
    vehicleFinder: {
      requestType: lead.type,
      vehicleTypes: [lead.vehicleKind === "motorcycle" ? "motorcycles" : "cars"],
      source: "vehicle_lead_conversion",
      buy:
        lead.type === "buy"
          ? {
              budgetMin: lead.budgetMin,
              budgetMax: lead.budgetMax,
              preferredModels: lead.displayTitle,
            }
          : undefined,
      sell:
        lead.type === "sell"
          ? {
              vehicleDetails: lead.displayTitle,
              askingPrice: lead.askingPrice,
            }
          : undefined,
    },
    vehicle: lead.vehicle,
    aiAnalysis: lead.aiAnalysis,
    officialListingPrice: lead.officialListingPrice,
  };

  const isFixedPayable =
    service.type === "fixed" && service.priceAmount != null && service.priceAmount > 0;

  const created = await createCaseRecord({
    caseNumber: nextCaseNumber(),
    serviceId: service.id,
    status: isFixedPayable ? "new" : "under_review",
    isGuest: true,
    guestEmail: lead.customerEmail,
    guestName: lead.customerName,
    guestPhone: lead.customerPhone,
    formData,
  });

  if (isFixedPayable) {
    await createInvoice({
      caseId: created.id,
      amount: service.priceAmount!,
      currency: service.priceCurrency ?? "THB",
      status: "unpaid",
      kind: "full",
    });
  }

  for (const media of lead.media) {
    await createDocument({
      caseId: created.id,
      name: media.name,
      storageKey: media.storageKey,
      uploadedBy: staffUserId,
      mimeType: media.mimeType ?? undefined,
      size: media.size ?? undefined,
      documentType: media.isPrivate ? `vehicle_${media.category}_private` : `vehicle_${media.category}`,
    });
  }

  await prisma.vehicleLead.update({
    where: { id: lead.id },
    data: {
      caseId: created.id,
      assignedStaffId: lead.assignedStaffId ?? staffUserId,
      statusHistory: {
        create: {
          fromStatus: lead.status,
          toStatus: lead.status,
          changedById: staffUserId,
          note: `Converted to booking ${created.caseNumber}`,
        },
      },
    },
  });

  void trackPlatformEvent("vehicle_lead_converted", {
    leadId: lead.id,
    caseId: created.id,
    caseNumber: created.caseNumber,
  });

  return created;
}

export function createUploadPlaceholderKey(name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "file";
  return `mock://vehicle-leads/${Date.now()}-${randomBytes(6).toString("hex")}-${safe}`;
}

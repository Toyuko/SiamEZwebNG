import { z } from "zod";
import {
  CONTACT_METHODS,
  CONTACT_TIMES,
  FUEL_OPTIONS,
  NEW_OR_USED,
  OWNERSHIP_OPTIONS,
  PURCHASE_PAYMENT,
  PURCHASE_TIMEFRAME,
  SELL_TIMELINE_OPTIONS,
  TRANSMISSION_OPTIONS,
  VEHICLE_MEDIA_CATEGORIES,
  YES_NO_UNKNOWN,
} from "@/config/vehicle-intake";

const optionalText = z.string().trim().max(2000).optional().or(z.literal(""));
const optionalShort = z.string().trim().max(200).optional().or(z.literal(""));
const optionalInt = z.coerce.number().int().min(0).max(99_999_999).optional().nullable();

export const uploadedMediaSchema = z.object({
  name: z.string().trim().min(1).max(240),
  storageKey: z.string().trim().min(1).max(2000),
  mimeType: z.string().trim().max(120).optional(),
  size: z.number().int().min(0).max(120 * 1024 * 1024).optional(),
  mediaType: z.enum(["image", "video", "document"]),
  category: z.enum(VEHICLE_MEDIA_CATEGORIES),
});

const sourceFields = {
  source: optionalShort,
  utmSource: optionalShort,
  utmMedium: optionalShort,
  utmCampaign: optionalShort,
  ref: optionalShort,
  locale: z.enum(["en", "th"]).optional(),
};

const contactSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerPhone: optionalShort,
  customerLineId: optionalShort,
  customerEmail: z.string().trim().email().max(200).optional().or(z.literal("")),
  preferredContactMethod: z.enum(CONTACT_METHODS).optional().or(z.literal("")),
  preferredContactTime: z.enum(CONTACT_TIMES).optional().or(z.literal("")),
  customerLocation: optionalShort,
});

const sellVehicleSchema = z.object({
  kind: z.enum(["car", "motorcycle", "other"]),
  make: z.string().trim().min(1).max(80),
  makeOther: optionalShort,
  model: z.string().trim().min(1).max(80),
  year: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 1),
  variant: optionalShort,
  engineSize: optionalShort,
  transmission: z.enum(TRANSMISSION_OPTIONS).optional().or(z.literal("")),
  fuel: z.enum(FUEL_OPTIONS).optional().or(z.literal("")),
  mileageKm: optionalInt,
  colour: optionalShort,
  province: optionalShort,
  city: optionalShort,
  overallCondition: optionalShort,
  accidentHistory: z.enum(YES_NO_UNKNOWN).optional().or(z.literal("")),
  floodDamage: z.enum(YES_NO_UNKNOWN).optional().or(z.literal("")),
  majorRepairs: optionalText,
  engineCondition: optionalShort,
  transmissionCondition: optionalShort,
  tireCondition: optionalShort,
  modifications: optionalText,
  knownProblems: optionalText,
  serviceHistory: optionalText,
  registeredOwner: optionalShort,
  ownershipStatus: z.enum(OWNERSHIP_OPTIONS).optional().or(z.literal("")),
  greenBookAvailable: z.boolean().optional(),
  blueBookAvailable: z.boolean().optional(),
  registrationProvince: optionalShort,
  taxStatus: optionalShort,
  insuranceStatus: optionalShort,
  outstandingFinance: optionalShort,
  restrictions: optionalText,
  askingPrice: optionalInt,
  priceNegotiable: z.boolean().optional(),
  sellTimeline: z.enum(SELL_TIMELINE_OPTIONS).optional().or(z.literal("")),
  reasonForSelling: optionalText,
  acceptRecommendedPrice: z.boolean().optional(),
});

const buyVehicleSchema = z.object({
  kind: z.enum(["car", "motorcycle", "other"]),
  make: optionalShort,
  makeOther: optionalShort,
  model: optionalShort,
  yearMin: optionalInt,
  yearMax: optionalInt,
  budgetMin: optionalInt,
  budgetMax: optionalInt,
  maxMileageKm: optionalInt,
  newOrUsed: z.enum(NEW_OR_USED).optional().or(z.literal("")),
  transmission: z.enum(TRANSMISSION_OPTIONS).optional().or(z.literal("")),
  fuel: z.enum(FUEL_OPTIONS).optional().or(z.literal("")),
  preferredColour: optionalShort,
  province: optionalShort,
  city: optionalShort,
  mustHaveFeatures: optionalText,
  dealBreakers: optionalText,
  purchasePayment: z.enum(PURCHASE_PAYMENT).optional().or(z.literal("")),
  purchaseTimeframe: z.enum(PURCHASE_TIMEFRAME).optional().or(z.literal("")),
  needDelivery: z.boolean().optional(),
  needTransfer: z.boolean().optional(),
  needInsurance: z.boolean().optional(),
  needInspection: z.boolean().optional(),
  needFinancingHelp: z.boolean().optional(),
});

function requirePhoneOrLine(
  data: { contact: { customerPhone?: string; customerLineId?: string } },
  ctx: z.RefinementCtx
) {
  if (!data.contact.customerPhone?.trim() && !data.contact.customerLineId?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Phone or LINE ID is required",
      path: ["contact", "customerPhone"],
    });
  }
}

export const sellVehicleLeadSchema = z.object({
  type: z.literal("sell"),
  vehicle: sellVehicleSchema,
  contact: contactSchema,
  media: z.array(uploadedMediaSchema).max(30).default([]),
  website: z.string().max(0).optional().or(z.literal("")),
  ...sourceFields,
});

export const buyVehicleLeadSchema = z.object({
  type: z.literal("buy"),
  vehicle: buyVehicleSchema,
  contact: contactSchema,
  media: z.array(uploadedMediaSchema).max(10).default([]),
  website: z.string().max(0).optional().or(z.literal("")),
  ...sourceFields,
});

export const submitVehicleLeadSchema = z
  .discriminatedUnion("type", [sellVehicleLeadSchema, buyVehicleLeadSchema])
  .superRefine(requirePhoneOrLine);

export type SubmitVehicleLeadInput = z.infer<typeof submitVehicleLeadSchema>;
export type UploadedVehicleMedia = z.infer<typeof uploadedMediaSchema>;

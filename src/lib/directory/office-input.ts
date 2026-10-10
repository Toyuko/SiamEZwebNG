import { z } from "zod";
import {
  CORRECTION_FIELDS,
  isVerificationStatus,
  REPORT_FIELDS,
  type VerificationStatus,
} from "@/lib/directory/constants";
import { isHttpUrl, isThailandCoordinate } from "@/lib/directory/maps";
import { resolveProvinceCode } from "@/lib/directory/provinces";
import { buildSearchText } from "@/lib/directory/search";
import type { HoursJson } from "@/lib/directory/hours";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null));

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .nullish()
  .transform((value, ctx) => {
    if (!value) return null;
    if (!isHttpUrl(value)) {
      ctx.addIssue({ code: "custom", message: "Enter a valid http(s) URL" });
      return z.NEVER;
    }
    return value;
  });

export const officeInputSchema = z
  .object({
    slug: z.string().trim().max(80).nullish().transform((value) => value || null),
    nameEn: z.string().trim().max(200).nullish().transform((value) => value || null),
    nameTh: z.string().trim().max(200).nullish().transform((value) => value || null),
    categorySlug: z.string().trim().min(1).max(80),
    parentOrganizationEn: optionalText(200),
    parentOrganizationTh: optionalText(200),
    branchNameEn: optionalText(200),
    branchNameTh: optionalText(200),
    keywords: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
    provinceCode: z.string().trim().min(1),
    district: optionalText(120),
    subdistrict: optionalText(120),
    addressEn: optionalText(2000),
    addressTh: optionalText(2000),
    postalCode: optionalText(12),
    latitude: z.number().finite().nullable().optional(),
    longitude: z.number().finite().nullable().optional(),
    googleMapsUrl: optionalUrl,
    extraMapUrls: z.array(z.string().trim().max(500)).max(8).default([]),
    phonePrimary: optionalText(40),
    phones: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
    email: z
      .string()
      .trim()
      .max(200)
      .nullish()
      .transform((value, ctx) => {
        if (!value) return null;
        if (!z.string().email().safeParse(value).success) {
          ctx.addIssue({ code: "custom", message: "Enter a valid email" });
          return z.NEVER;
        }
        return value;
      }),
    website: optionalUrl,
    facebookUrl: optionalUrl,
    contactNotes: optionalText(4000),
    openingHoursText: optionalText(4000),
    operatingDays: optionalText(400),
    lunchBreak: optionalText(200),
    holidayNotes: optionalText(4000),
    appointmentRequired: z.boolean().nullable().optional(),
    walkInsAccepted: z.boolean().nullable().optional(),
    appointmentNotes: optionalText(4000),
    serviceNotes: optionalText(8000),
    documentsRequired: optionalText(8000),
    bookingInfo: optionalText(4000),
    governmentLinks: optionalText(4000),
    internalNotes: optionalText(8000),
    proceduralNotes: optionalText(8000),
    staffTips: optionalText(8000),
    parkingNotes: optionalText(4000),
    counterNotes: optionalText(4000),
    verificationStatus: z.string().trim().default("unverified"),
    sourceUrl: optionalUrl,
    sourceNotes: optionalText(4000),
    lastVerifiedAt: z.string().trim().nullish().transform((value) => value || null),
    lastVerificationMethod: optionalText(200),
    reliabilityNotes: optionalText(4000),
    serviceSlugs: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  })
  .superRefine((value, ctx) => {
    if (!value.nameEn && !value.nameTh) {
      ctx.addIssue({ code: "custom", path: ["nameEn"], message: "Enter an English or Thai name" });
    }
    if (!resolveProvinceCode(value.provinceCode)) {
      ctx.addIssue({ code: "custom", path: ["provinceCode"], message: "Choose a Thai province" });
    }
    const lat = value.latitude ?? null;
    const lng = value.longitude ?? null;
    const hasLat = lat != null;
    const hasLng = lng != null;
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: "custom",
        path: ["latitude"],
        message: "Enter both latitude and longitude, or leave both blank",
      });
    } else if (hasLat && hasLng && !isThailandCoordinate(lat, lng)) {
      ctx.addIssue({
        code: "custom",
        path: ["latitude"],
        message: "Coordinates must be inside Thailand",
      });
    }
    if (!isVerificationStatus(value.verificationStatus)) {
      ctx.addIssue({ code: "custom", path: ["verificationStatus"], message: "Unknown verification status" });
    }
    if (value.verificationStatus === "verified" && !value.lastVerifiedAt && !value.sourceUrl) {
      ctx.addIssue({
        code: "custom",
        path: ["verificationStatus"],
        message: "Verified records need a verification date or a source URL",
      });
    }
    for (const url of value.extraMapUrls) {
      if (!isHttpUrl(url)) {
        ctx.addIssue({ code: "custom", path: ["extraMapUrls"], message: "Map links must be http(s) URLs" });
        break;
      }
    }
  });

export type OfficeInput = z.infer<typeof officeInputSchema>;

export function splitList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[\n|,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function triState(value: string | null | undefined): boolean | null {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (["yes", "true", "1", "y"].includes(normalized)) return true;
  if (["no", "false", "0", "n"].includes(normalized)) return false;
  return null;
}

export function formString(form: FormData, key: string): string {
  return String(form.get(key) ?? "").replace(/\u0000/g, "").trim();
}

export function officeInputFromForm(form: FormData): OfficeInput {
  const latRaw = formString(form, "latitude");
  const lngRaw = formString(form, "longitude");
  return {
    slug: formString(form, "slug") || null,
    nameEn: formString(form, "nameEn"),
    nameTh: formString(form, "nameTh"),
    categorySlug: formString(form, "categorySlug"),
    parentOrganizationEn: formString(form, "parentOrganizationEn") || null,
    parentOrganizationTh: formString(form, "parentOrganizationTh") || null,
    branchNameEn: formString(form, "branchNameEn") || null,
    branchNameTh: formString(form, "branchNameTh") || null,
    keywords: splitList(formString(form, "keywords")),
    provinceCode: formString(form, "provinceCode"),
    district: formString(form, "district") || null,
    subdistrict: formString(form, "subdistrict") || null,
    addressEn: formString(form, "addressEn") || null,
    addressTh: formString(form, "addressTh") || null,
    postalCode: formString(form, "postalCode") || null,
    latitude: latRaw ? Number(latRaw) : null,
    longitude: lngRaw ? Number(lngRaw) : null,
    googleMapsUrl: formString(form, "googleMapsUrl") || null,
    extraMapUrls: splitList(formString(form, "extraMapUrls")),
    phonePrimary: formString(form, "phonePrimary") || null,
    phones: splitList(formString(form, "phones")),
    email: formString(form, "email") || null,
    website: formString(form, "website") || null,
    facebookUrl: formString(form, "facebookUrl") || null,
    contactNotes: formString(form, "contactNotes") || null,
    openingHoursText: formString(form, "openingHoursText") || null,
    operatingDays: formString(form, "operatingDays") || null,
    lunchBreak: formString(form, "lunchBreak") || null,
    holidayNotes: formString(form, "holidayNotes") || null,
    appointmentRequired: triState(formString(form, "appointmentRequired")),
    walkInsAccepted: triState(formString(form, "walkInsAccepted")),
    appointmentNotes: formString(form, "appointmentNotes") || null,
    serviceNotes: formString(form, "serviceNotes") || null,
    documentsRequired: formString(form, "documentsRequired") || null,
    bookingInfo: formString(form, "bookingInfo") || null,
    governmentLinks: formString(form, "governmentLinks") || null,
    internalNotes: formString(form, "internalNotes") || null,
    proceduralNotes: formString(form, "proceduralNotes") || null,
    staffTips: formString(form, "staffTips") || null,
    parkingNotes: formString(form, "parkingNotes") || null,
    counterNotes: formString(form, "counterNotes") || null,
    verificationStatus: formString(form, "verificationStatus") || "unverified",
    sourceUrl: formString(form, "sourceUrl") || null,
    sourceNotes: formString(form, "sourceNotes") || null,
    lastVerifiedAt: formString(form, "lastVerifiedAt") || null,
    lastVerificationMethod: formString(form, "lastVerificationMethod") || null,
    reliabilityNotes: formString(form, "reliabilityNotes") || null,
    serviceSlugs: form.getAll("serviceSlugs").map((value) => String(value).trim()).filter(Boolean),
  };
}

export function composeSearchDocument(input: {
  office: OfficeInput;
  categoryNameEn?: string | null;
  categoryNameTh?: string | null;
  serviceNames?: string[];
  provinceNameEn?: string | null;
  provinceNameTh?: string | null;
}): string {
  const office = input.office;
  return buildSearchText([
    office.nameEn,
    office.nameTh,
    office.branchNameEn,
    office.branchNameTh,
    office.parentOrganizationEn,
    office.parentOrganizationTh,
    office.keywords.join(" "),
    office.provinceCode,
    input.provinceNameEn,
    input.provinceNameTh,
    office.district,
    office.subdistrict,
    office.addressEn,
    office.addressTh,
    office.postalCode,
    office.phonePrimary,
    office.phones.join(" "),
    office.email,
    office.contactNotes,
    office.openingHoursText,
    office.serviceNotes,
    office.documentsRequired,
    office.bookingInfo,
    input.categoryNameEn,
    input.categoryNameTh,
    ...(input.serviceNames ?? []),
    office.serviceSlugs.join(" "),
  ]);
}

export function verifiedStatus(value: string): VerificationStatus {
  return isVerificationStatus(value) ? value : "unverified";
}

export const reportInputSchema = z.object({
  officeId: z.string().trim().min(1),
  field: z.enum(REPORT_FIELDS),
  explanation: z.string().trim().min(8).max(4000),
});

export const correctionInputSchema = z.object({
  officeId: z.string().trim().min(1),
  field: z.enum(CORRECTION_FIELDS),
  suggestedValue: z.string().trim().min(1).max(8000),
  explanation: z.string().trim().max(4000).optional().transform((value) => value || null),
});

export const newOfficeSubmissionSchema = z.object({
  nameEn: z.string().trim().max(200).optional().transform((value) => value || null),
  nameTh: z.string().trim().max(200).optional().transform((value) => value || null),
  categorySlug: z.string().trim().min(1).max(80),
  provinceCode: z.string().trim().min(1),
  district: optionalText(120),
  phonePrimary: optionalText(40),
  addressEn: optionalText(2000),
  addressTh: optionalText(2000),
  website: optionalUrl,
  notes: optionalText(4000),
}).superRefine((value, ctx) => {
  if (!value.nameEn && !value.nameTh) {
    ctx.addIssue({ code: "custom", path: ["nameEn"], message: "Enter an English or Thai name" });
  }
  if (!resolveProvinceCode(value.provinceCode)) {
    ctx.addIssue({ code: "custom", path: ["provinceCode"], message: "Choose a Thai province" });
  }
});

export type HoursPayload = HoursJson | null;

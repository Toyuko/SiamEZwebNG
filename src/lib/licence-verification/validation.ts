import { z } from "zod";
import { LICENCE_SERVICE_KINDS, type LicenceServiceKind } from "@/lib/licence-verification/types";

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date in YYYY-MM-DD format.");
const optionalIso = z.union([iso, z.literal("")]).optional();

export const applicantInputSchema = z.object({
  serviceKind: z.enum(LICENCE_SERVICE_KINDS),
  fullLegalName: z.string().trim().min(2).max(200),
  nationality: z.string().trim().min(2).max(80),
  dateOfBirth: iso,
  passportNumber: z.string().trim().min(5).max(30),
  countryOfResidence: z.string().trim().min(2).max(80),
  immigrationStatus: z.string().trim().min(2).max(80),
  visaExpiryDate: optionalIso,
  thaiAddress: z.string().trim().min(8).max(500),
  hasResidenceCertificate: z.boolean(),
  hasWorkPermit: z.boolean(),
  hasForeignLicence: z.boolean(),
  foreignLicenceCountry: z.string().trim().max(80).optional().or(z.literal("")),
  foreignLicenceCategories: z.string().trim().max(120).optional().or(z.literal("")),
  foreignLicenceIssueDate: optionalIso,
  foreignLicenceExpiryDate: optionalIso,
  foreignLicenceFormat: z.enum(["physical", "digital"]).optional(),
  foreignLicenceLanguage: z.enum(["english", "other"]).optional(),
  previouslyHeldThaiLicence: z.boolean(),
  failedOrAttemptedBefore: z.boolean(),
  attemptNotes: z.string().trim().max(1000).optional().or(z.literal("")),
  renewalVehicle: z.enum(["car", "bike", "both"]).optional(),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(6).max(30),
  locale: z.enum(["en", "th"]).optional(),
});

export type ApplicantInput = z.infer<typeof applicantInputSchema>;

export function validateApplicant(raw: unknown): { ok: true; data: ApplicantInput } | { ok: false; error: string } {
  const parsed = applicantInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the application form." };
  }
  const data = parsed.data;
  const thai = data.nationality.trim().toLowerCase() === "thai" || data.immigrationStatus === "thai_citizen";
  if (!thai && !data.visaExpiryDate) {
    return { ok: false, error: "Enter the visa or stay expiry date." };
  }
  if (data.serviceKind.startsWith("CONVERSION_")) {
    if (!data.foreignLicenceCountry || !data.foreignLicenceCategories || !data.foreignLicenceIssueDate || !data.foreignLicenceExpiryDate) {
      return { ok: false, error: "Enter the foreign licence country, categories, issue date, and expiry date." };
    }
    if (!data.foreignLicenceFormat || !data.foreignLicenceLanguage) {
      return { ok: false, error: "Say whether the foreign licence is physical or digital, and whether it is in English." };
    }
  }
  if ((data.serviceKind === "RENEWAL" || data.serviceKind === "LOST_REPLACEMENT") && !data.renewalVehicle) {
    return { ok: false, error: "Choose car, motorcycle, or both." };
  }
  if (data.dateOfBirth > new Date().toISOString().slice(0, 10)) {
    return { ok: false, error: "Date of birth cannot be in the future." };
  }
  return { ok: true, data };
}

export function profileFromInput(data: ApplicantInput): {
  serviceKind: LicenceServiceKind;
  email: string;
  phone: string;
  locale: "en" | "th";
  profile: import("@/lib/licence-verification/types").ApplicantProfile;
} {
  return {
    serviceKind: data.serviceKind,
    email: data.email.toLowerCase(),
    phone: data.phone,
    locale: data.locale === "th" ? "th" : "en",
    profile: {
      fullLegalName: data.fullLegalName,
      nationality: data.nationality,
      dateOfBirth: data.dateOfBirth,
      passportNumber: data.passportNumber,
      countryOfResidence: data.countryOfResidence,
      immigrationStatus: data.immigrationStatus,
      visaExpiryDate: data.visaExpiryDate || null,
      thaiAddress: data.thaiAddress,
      hasResidenceCertificate: data.hasResidenceCertificate,
      hasWorkPermit: data.hasWorkPermit,
      hasForeignLicence: data.hasForeignLicence || data.serviceKind.startsWith("CONVERSION_"),
      foreignLicenceCountry: data.foreignLicenceCountry || null,
      foreignLicenceCategories: data.foreignLicenceCategories || null,
      foreignLicenceIssueDate: data.foreignLicenceIssueDate || null,
      foreignLicenceExpiryDate: data.foreignLicenceExpiryDate || null,
      foreignLicenceFormat: data.foreignLicenceFormat ?? null,
      foreignLicenceLanguage: data.foreignLicenceLanguage ?? null,
      previouslyHeldThaiLicence: data.previouslyHeldThaiLicence,
      failedOrAttemptedBefore: data.failedOrAttemptedBefore,
      attemptNotes: data.attemptNotes || null,
      renewalVehicle: data.renewalVehicle ?? null,
    },
  };
}

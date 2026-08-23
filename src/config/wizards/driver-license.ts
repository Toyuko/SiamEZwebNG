import {
  computeAddonsTotalThb,
  computeBasePriceThb,
  computeDepositThb,
  DRIVER_LICENSE_DEPOSIT_PERCENT,
  isYesAnswer,
  normalizeDriverLicenseRequirements,
  type LicenseAddons,
  type LicenseServiceCategory,
  type LicenseVehicleType,
  type ResidentialCertificatePlan,
} from "@/lib/driver-license-booking";
import { driverLicenseQuoteQuestions } from "@/config/pricing/driver-license";
import type { WizardConfig } from "./types";
import { contactFields, notesField, quoteReviewStep } from "./shared";

function trimOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

function asResidentialPlan(value: unknown): ResidentialCertificatePlan | null {
  if (value === "self" || value === "need_help") return value;
  return null;
}

/** Preserve nested `driverLicense` formData shape expected by marketplace pricing. */
export function buildDriverLicenseFormData(
  values: Record<string, unknown>
): Record<string, unknown> {
  const normalized = normalizeDriverLicenseRequirements(values);
  const category = normalized.category as LicenseServiceCategory;
  const vehicleType =
    category === "idp" ? null : ((normalized.vehicleType as LicenseVehicleType) || null);
  const residentialCertificate = asResidentialPlan(normalized.residentialCertificate);
  const addons: LicenseAddons = {
    translationLetter: Boolean(normalized.addonTranslationLetter),
    addressCertificate:
      residentialCertificate === "need_help" || Boolean(normalized.addonAddressCertificate),
  };
  const basePriceThb = computeBasePriceThb(category, vehicleType, {
    hasForeignLicense: normalized.hasForeignLicense,
    residentialCertificate: normalized.residentialCertificate,
  });
  const addonsTotalThb = computeAddonsTotalThb(addons);
  const totalThb = basePriceThb + addonsTotalThb;
  const depositThb = computeDepositThb(totalThb);
  return {
    name: values.name,
    email: values.email,
    phone: values.phone,
    notes: trimOrUndefined(values.notes),
    driverLicense: {
      category,
      vehicleType,
      hasForeignLicense: isYesAnswer(normalized.hasForeignLicense),
      residentialCertificate,
      fitToDrive: isYesAnswer(normalized.fitToDrive),
      addons,
      appointmentDate: values.appointmentDate,
      basePriceThb,
      addonsTotalThb,
      totalThb,
      depositThb,
      depositPercent: DRIVER_LICENSE_DEPOSIT_PERCENT,
      remainingThb: totalThb - depositThb,
      currency: "THB",
    },
  };
}

export const driverLicenseWizard: WizardConfig = {
  serviceSlug: "driver-license",
  autosaveKey: "driver-license",
  showMarketplaceToggle: true,
  enableSmartQuote: true,
  buildFormData: buildDriverLicenseFormData,
  steps: [
    {
      id: "summary",
      type: "summary",
      label: "Service summary",
      description:
        "Thai driver's license assistance: conversion, renewal, new license, or IDP. Answer each question so we can calculate your quote. Pay 25% now; the remaining 75% is due after you get your license.",
    },
    {
      id: "service",
      type: "fields",
      label: "Quote questions",
      description:
        "Take time to answer each question so we can give you a quotation. Your 25% deposit is due at booking; the remaining 75% is due after you get your license.",
      generatesQuote: true,
      fields: [
        {
          name: "category",
          type: "select",
          label: "License service",
          required: true,
          options: [
            { value: "conversion", label: "Foreign license conversion" },
            { value: "renewal", label: "Renewal" },
            { value: "apply_new", label: "Apply for new license" },
            { value: "idp", label: "International Driving Permit (IDP)" },
          ],
        },
        ...driverLicenseQuoteQuestions,
        {
          name: "nationality",
          type: "text",
          label: "Nationality",
          placeholder: "e.g. Canadian",
        },
        {
          name: "addonTranslationLetter",
          type: "checkbox",
          label: "Translation letter (+1,500 THB)",
        },
      ],
    },
    quoteReviewStep,
    {
      id: "appointment",
      type: "fields",
      label: "Appointment",
      description:
        "Choose a weekday (Monday–Friday) at least 3 calendar days ahead. Weekends are not available.",
      fields: [
        {
          name: "appointmentDate",
          type: "date",
          label: "Preferred appointment date",
          required: true,
          customValidate: "driverLicenseAppointment",
        },
      ],
    },
    {
      id: "details",
      type: "fields",
      label: "Your details",
      fields: [
        ...contactFields.map((f) =>
          f.name === "phone"
            ? { ...f, label: "Phone / WhatsApp", placeholder: "+66…" }
            : f
        ),
        notesField,
      ],
    },
    {
      id: "documents",
      type: "documents",
      label: "Payment receipt",
      description:
        "Upload your 25% deposit bank transfer / PromptPay receipt (required). The remaining 75% is due after you get your license. Signed-in uploads are linked to your booking via document IDs.",
      documentsRequired: true,
      requiredDocuments: [
        {
          id: "payment_receipt",
          label: "Payment receipt / bank slip",
          documentType: "payment_receipt",
          required: true,
        },
      ],
    },
    {
      id: "review",
      type: "review",
      label: "Review & submit",
    },
  ],
};

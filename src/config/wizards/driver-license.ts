import {
  computeAddonsTotalThb,
  computeBasePriceThb,
  computeDepositThb,
  type LicenseAddons,
  type LicenseServiceCategory,
  type LicenseVehicleType,
} from "@/lib/driver-license-booking";
import type { WizardConfig } from "./types";
import { contactFields, notesField, quoteReviewStep } from "./shared";

function trimOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

/** Preserve nested `driverLicense` formData shape expected by marketplace pricing. */
export function buildDriverLicenseFormData(
  values: Record<string, unknown>
): Record<string, unknown> {
  const category = values.category as LicenseServiceCategory;
  const vehicleType =
    category === "idp" ? null : ((values.vehicleType as LicenseVehicleType) || null);
  const addons: LicenseAddons = {
    translationLetter: Boolean(values.addonTranslationLetter),
    addressCertificate: Boolean(values.addonAddressCertificate),
  };
  const basePriceThb = computeBasePriceThb(category, vehicleType);
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
      addons,
      appointmentDate: values.appointmentDate,
      basePriceThb,
      addonsTotalThb,
      totalThb,
      depositThb,
      depositPercent: 50,
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
        "Thai driver's license assistance: conversion, renewal, new license, or IDP. Quote totals are calculated from your selections.",
    },
    {
      id: "service",
      type: "fields",
      label: "Service",
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
        {
          name: "vehicleType",
          type: "select",
          label: "Vehicle type",
          required: true,
          showWhen: { field: "category", notEquals: "idp" },
          options: [
            { value: "bike", label: "Motorcycle / bike" },
            { value: "car", label: "Car" },
            { value: "both", label: "Both car and bike" },
          ],
        },
        {
          name: "nationality",
          type: "text",
          label: "Nationality",
          placeholder: "e.g. Canadian",
        },
      ],
    },
    {
      id: "addons",
      type: "fields",
      label: "Add-ons",
      description: "Optional add-ons. You can skip this step with nothing selected.",
      generatesQuote: true,
      fields: [
        {
          name: "addonTranslationLetter",
          type: "checkbox",
          label: "Translation letter (+1,500 THB)",
        },
        {
          name: "addonAddressCertificate",
          type: "checkbox",
          label: "Residential certificate (+2,500 THB)",
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
        "Upload your 50% deposit bank transfer / PromptPay receipt (required). The balance is due after you get your license. Signed-in uploads are linked to your booking via document IDs.",
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

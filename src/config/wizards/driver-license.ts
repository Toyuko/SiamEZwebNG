import {
  computeAddonsTotalThb,
  computeBasePriceThb,
  type LicenseAddons,
  type LicenseServiceCategory,
  type LicenseVehicleType,
} from "@/lib/driver-license-booking";
import type { WizardConfig } from "./types";
import { contactFields, notesField } from "./shared";

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
    fastTrack: Boolean(values.addonFastTrack),
    translationLetter: Boolean(values.addonTranslationLetter),
    addressCertificate: Boolean(values.addonAddressCertificate),
  };
  const basePriceThb = computeBasePriceThb(category, vehicleType);
  const addonsTotalThb = computeAddonsTotalThb(addons);
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
      totalThb: basePriceThb + addonsTotalThb,
      currency: "THB",
    },
  };
}

export const driverLicenseWizard: WizardConfig = {
  serviceSlug: "driver-license",
  autosaveKey: "driver-license",
  showMarketplaceToggle: true,
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
      ],
    },
    {
      id: "addons",
      type: "fields",
      label: "Add-ons",
      description: "Optional add-ons. You can skip this step with nothing selected.",
      fields: [
        {
          name: "addonFastTrack",
          type: "checkbox",
          label: "FastTrack (+1,500 THB)",
        },
        {
          name: "addonTranslationLetter",
          type: "checkbox",
          label: "Translation letter (+2,500 THB)",
        },
        {
          name: "addonAddressCertificate",
          type: "checkbox",
          label: "Address certificate (+2,500 THB)",
        },
      ],
    },
    {
      id: "appointment",
      type: "fields",
      label: "Appointment",
      description:
        "Choose a weekday at least 3 calendar days ahead (weekends are not available).",
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
        "Upload your bank transfer / PromptPay receipt (required). Signed-in uploads are linked to your booking via document IDs.",
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

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
import { contactFields, notesField, quoteReviewStep, depositPaymentMethodAppointmentField } from "./shared";

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
  const basePriceThb = computeBasePriceThb(category, vehicleType);
  const addonsTotalThb = computeAddonsTotalThb(addons);
  const totalThb = basePriceThb + addonsTotalThb;
  const depositThb = computeDepositThb(totalThb);
  return {
    name: values.name,
    email: values.email,
    phone: values.phone,
    notes: trimOrUndefined(values.notes),
    depositPaymentMethod: values.depositPaymentMethod ?? "online",
    driverLicense: {
      category,
      vehicleType,
      hasForeignLicense: isYesAnswer(normalized.hasForeignLicense),
      residentialCertificate,
      fitToDrive: isYesAnswer(normalized.fitToDrive),
      addons,
      appointmentDate: values.appointmentDate,
      depositPaymentMethod: values.depositPaymentMethod ?? "online",
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
      id: "service",
      type: "fields",
      label: "Tell us what you need",
      description:
        "Answer a few quick questions so we can find the right service and quote for you.",
      stage: "service",
      stageLabel: "Service",
      continueLabel: "Continue",
      generatesQuote: true,
      fields: [
        {
          name: "category",
          type: "select",
          label: "What do you need?",
          required: true,
          presentation: "cards",
          options: [
            {
              value: "apply_new",
              label: "New Thai license",
              description: "First-time license with SiamEZ support",
            },
            {
              value: "conversion",
              label: "Convert foreign license",
              description: "Turn your home license into a Thai one",
            },
            {
              value: "renewal",
              label: "Renew license",
              description: "Renew your existing Thai license",
            },
            {
              value: "idp",
              label: "International Driving Permit",
              description: "Get an IDP for travel abroad",
            },
          ],
        },
        ...driverLicenseQuoteQuestions,
        {
          name: "nationality",
          type: "text",
          label: "Nationality (optional)",
          placeholder: "e.g. Canadian",
        },
        {
          name: "addonTranslationLetter",
          type: "checkbox",
          label: "Add translation letter (+1,500 THB)",
          description: "Useful when your documents need an official Thai translation.",
        },
      ],
    },
    {
      ...quoteReviewStep,
      label: "Your service & quote",
      description: "Here's what we recommend based on your answers.",
      stage: "quote",
      stageLabel: "Quote",
      continueLabel: "Continue to booking",
    },
    {
      id: "details",
      type: "fields",
      label: "Your booking details",
      description:
        "Tell us how to reach you and pick a preferred appointment. We'll confirm the time with you.",
      stage: "details",
      stageLabel: "Details",
      continueLabel: "Continue to confirmation",
      fields: [
        {
          name: "appointmentDate",
          type: "date",
          label: "Preferred appointment date",
          description:
            "Preferred date — pending confirmation. Weekdays only, at least 3 days ahead.",
          required: true,
          customValidate: "driverLicenseAppointment",
        },
        {
          ...depositPaymentMethodAppointmentField,
          presentation: "cards",
          label: "How would you like to pay the deposit?",
          options: [
            {
              value: "online",
              label: "Pay online now",
              description: "PromptPay, bank transfer, or Wise",
            },
            {
              value: "office_cash",
              label: "Pay at the office",
              description: "Cash at SiamEZ Bangkok on appointment day",
            },
          ],
        },
        ...contactFields.map((f) =>
          f.name === "phone"
            ? { ...f, label: "Phone / WhatsApp", placeholder: "+66…" }
            : f
        ),
        {
          ...notesField,
          label: "Anything else we should know? (optional)",
        },
      ],
    },
    {
      id: "documents",
      type: "documents",
      label: "Payment receipt",
      description:
        "Upload your deposit receipt so we can verify payment. PDF, JPG, or PNG up to 10MB.",
      stage: "details",
      stageLabel: "Details",
      continueLabel: "Continue to confirmation",
      showWhen: { field: "depositPaymentMethod", notEquals: "office_cash" },
      documentsRequired: true,
      requiredDocuments: [
        {
          id: "payment_receipt",
          label: "Deposit payment receipt",
          description: "Bank transfer / PromptPay / Wise slip for the amount due now",
          documentType: "payment_receipt",
          required: true,
        },
      ],
    },
    {
      id: "review",
      type: "review",
      label: "Review your booking",
      description: "Check your details before submitting.",
      stage: "confirm",
      stageLabel: "Confirm",
      continueLabel: "Confirm & submit booking",
    },
  ],
};

import type { WizardConfig } from "./types";

/**
 * Live generic wizard config for Marriage Registration (quote service).
 * Wired via Universal Wizard Engine — specialty wizards remain untouched.
 */
export const marriageRegistrationWizard: WizardConfig = {
  serviceSlug: "marriage-registration",
  autosaveKey: "marriage-registration",
  showMarketplaceToggle: true,
  steps: [
    {
      id: "summary",
      type: "summary",
      label: "Service summary",
      labelKey: "steps.summary",
    },
    {
      id: "details",
      type: "fields",
      label: "Your details",
      labelKey: "steps.details",
      fields: [
        {
          name: "name",
          type: "text",
          label: "Full name",
          labelKey: "fields.name",
          placeholder: "John Doe",
          required: true,
          maxLength: 200,
        },
        {
          name: "email",
          type: "email",
          label: "Email",
          labelKey: "fields.email",
          placeholder: "you@example.com",
          required: true,
        },
        {
          name: "phone",
          type: "phone",
          label: "Phone",
          labelKey: "fields.phone",
          placeholder: "+66 00 000 0000",
          required: true,
          maxLength: 30,
        },
      ],
    },
    {
      id: "questions",
      type: "fields",
      label: "Marriage details",
      labelKey: "steps.questions",
      description:
        "Tell us about your marriage registration so we can prepare an accurate quote.",
      fields: [
        {
          name: "marriageType",
          type: "select",
          label: "Registration type",
          labelKey: "fields.marriageType",
          required: true,
          options: [
            { value: "thai_thai", label: "Thai + Thai" },
            { value: "thai_foreign", label: "Thai + Foreign national" },
            { value: "foreign_foreign", label: "Two foreign nationals" },
            { value: "other", label: "Other / not sure" },
          ],
        },
        {
          name: "partnerNationality",
          type: "text",
          label: "Partner nationality",
          labelKey: "fields.partnerNationality",
          placeholder: "e.g. British, American",
          required: true,
          showWhen: {
            or: [
              { field: "marriageType", equals: "thai_foreign" },
              { field: "marriageType", equals: "foreign_foreign" },
            ],
          },
        },
        {
          name: "preferredDate",
          type: "date",
          label: "Preferred registration date",
          labelKey: "fields.preferredDate",
        },
        {
          name: "needsTranslation",
          type: "checkbox",
          label: "I need document translation assistance",
          labelKey: "fields.needsTranslation",
        },
        {
          name: "translationLanguages",
          type: "text",
          label: "Translation languages",
          labelKey: "fields.translationLanguages",
          placeholder: "e.g. English → Thai",
          required: true,
          showWhen: { field: "needsTranslation", truthy: true },
        },
        {
          name: "notes",
          type: "textarea",
          label: "Additional notes",
          labelKey: "fields.notes",
          placeholder: "Anything else we should know?",
          maxLength: 2000,
        },
      ],
    },
    {
      id: "documents",
      type: "documents",
      label: "Documents",
      labelKey: "steps.documents",
      description:
        "Upload passport copies, affidavits, or other supporting documents if you have them. Signed-in uploads are linked to your booking; guests can continue with a checklist warning.",
      requiredDocuments: [
        {
          id: "passport",
          label: "Passport copy",
          documentType: "passport",
          required: true,
          prefillFields: ["name", "partnerNationality"],
        },
        {
          id: "affidavit",
          label: "Affidavit / single-status certificate",
          documentType: "affidavit",
          required: false,
          prefillFields: ["name"],
        },
      ],
    },
    {
      id: "review",
      type: "review",
      label: "Review & submit",
      labelKey: "steps.review",
    },
  ],
};

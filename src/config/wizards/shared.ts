import type { WizardConfig, WizardFieldConfig, WizardStepConfig } from "./types";

/** Standard contact fields used by most booking wizards. */
export const contactFields: WizardFieldConfig[] = [
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
];

export const notesField: WizardFieldConfig = {
  name: "notes",
  type: "textarea",
  label: "Additional notes",
  labelKey: "fields.notes",
  placeholder: "Anything else we should know?",
  maxLength: 2000,
};

type GenericWizardOptions = {
  /** Extra fields appended on the details step (after contact). */
  extraDetailsFields?: WizardFieldConfig[];
  /** Optional mid-flow questions step inserted after details. */
  questionsStep?: WizardStepConfig;
  summaryDescription?: string;
  documentsDescription?: string;
  showMarketplaceToggle?: boolean;
  /** Missing-document checklist for the documents step. */
  requiredDocuments?: WizardStepConfig["requiredDocuments"];
  documentsRequired?: boolean;
};

/**
 * Standard quote/fixed booking wizard: summary → details → documents → review.
 * Fixed vs quote checkout is decided by `service.type` in WizardEngine / submitBooking.
 */
export function createGenericBookingWizard(
  serviceSlug: string,
  options: GenericWizardOptions = {}
): WizardConfig {
  const detailsStep: WizardStepConfig = {
    id: "details",
    type: "fields",
    label: "Your details",
    labelKey: "steps.details",
    fields: [...contactFields, ...(options.extraDetailsFields ?? [])],
  };

  const steps: WizardStepConfig[] = [
    {
      id: "summary",
      type: "summary",
      label: "Service summary",
      labelKey: "steps.summary",
      description: options.summaryDescription,
    },
    detailsStep,
  ];

  if (options.questionsStep) {
    steps.push(options.questionsStep);
  }

  steps.push(
    {
      id: "documents",
      type: "documents",
      label: "Documents",
      labelKey: "steps.documents",
      description:
        options.documentsDescription ??
        "Upload supporting documents if you have them. Signed-in users store files for the booking; guests can attach metadata and finish uploads after login.",
      documentsRequired: options.documentsRequired,
      requiredDocuments: options.requiredDocuments,
    },
    {
      id: "review",
      type: "review",
      label: "Review & submit",
      labelKey: "steps.review",
    }
  );

  return {
    serviceSlug,
    autosaveKey: serviceSlug,
    showMarketplaceToggle: options.showMarketplaceToggle ?? true,
    steps,
  };
}

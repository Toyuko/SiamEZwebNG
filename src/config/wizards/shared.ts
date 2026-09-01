import type { WizardConfig, WizardFieldConfig, WizardStepConfig } from "./types";
import { depositPaymentMethodField } from "./shared";

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

/** Deposit payment preference for online transfer vs in-person cash at the Bangkok office. */
export const depositPaymentMethodField: WizardFieldConfig = {
  name: "depositPaymentMethod",
  type: "select",
  label: "How will you pay your deposit?",
  required: true,
  options: [
    {
      value: "online",
      label: "Pay online now (PromptPay / bank transfer)",
    },
    {
      value: "office_cash",
      label: "Pay deposit in cash at the SiamEZ Bangkok office",
    },
  ],
};

/** Same as depositPaymentMethodField but tied to a scheduled appointment visit. */
export const depositPaymentMethodAppointmentField: WizardFieldConfig = {
  ...depositPaymentMethodField,
  options: [
    {
      value: "online",
      label: "Pay online now (PromptPay / bank transfer)",
    },
    {
      value: "office_cash",
      label: "Pay deposit in cash at the SiamEZ office on your appointment day",
    },
  ],
};

export const quoteReviewStep: WizardStepConfig = {
  id: "quote",
  type: "quote_review",
  label: "Your quote",
  labelKey: "steps.quote",
  description: "Review your personalized SiamEZ quote before continuing.",
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
  /** Enable AI / pricing-engine quote review step. */
  enableSmartQuote?: boolean;
  /** Offer in-person cash deposit at the SiamEZ office (smart-quote services). */
  enableOfficeCashDeposit?: boolean;
};

/**
 * Standard quote/fixed booking wizard: summary → details → [questions] → [quote] → documents → review.
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
    fields: [
      ...contactFields,
      ...(options.extraDetailsFields ?? []),
      ...(options.enableOfficeCashDeposit && options.enableSmartQuote
        ? [depositPaymentMethodField]
        : []),
    ],
    generatesQuote: Boolean(options.enableSmartQuote && !options.questionsStep),
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
    steps.push({
      ...options.questionsStep,
      generatesQuote: options.enableSmartQuote
        ? true
        : options.questionsStep.generatesQuote,
    });
  }

  if (options.enableSmartQuote) {
    steps.push(quoteReviewStep);
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
    enableSmartQuote: options.enableSmartQuote ?? false,
    steps,
  };
}

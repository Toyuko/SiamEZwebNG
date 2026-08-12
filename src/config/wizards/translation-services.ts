import { createGenericBookingWizard, notesField } from "./shared";

export const translationServicesWizard = createGenericBookingWizard(
  "translation-services",
  {
    enableSmartQuote: true,
    summaryDescription:
      "Answer a few questions for a calculated translation quote. Government/MFA fees are labeled when estimated.",
    extraDetailsFields: [
      {
        name: "documentType",
        type: "select",
        label: "Document type",
        required: true,
        options: [
          { value: "general", label: "General document" },
          { value: "legal", label: "Legal / court" },
          { value: "academic", label: "Academic" },
          { value: "id", label: "ID / passport / license" },
        ],
      },
      {
        name: "sourceLanguage",
        type: "text",
        label: "Source language",
        placeholder: "e.g. English",
        required: true,
      },
      {
        name: "targetLanguage",
        type: "text",
        label: "Target language",
        placeholder: "e.g. Thai",
        required: true,
      },
      {
        name: "pageCount",
        type: "number",
        label: "Number of pages",
        required: true,
        min: "1",
      },
      {
        name: "certified",
        type: "checkbox",
        label: "Certified translation required",
      },
      {
        name: "mfaLegalization",
        type: "checkbox",
        label: "MFA / legalization assistance",
      },
      {
        name: "express",
        type: "checkbox",
        label: "Express turnaround",
      },
      notesField,
    ],
    documentsDescription:
      "Upload the documents to translate if you have them. Metadata is saved now; file storage may be completed later.",
  }
);

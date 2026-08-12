import { createGenericBookingWizard, notesField } from "./shared";

/** Fixed-price translation — WizardEngine routes to checkout when service.type === "fixed". */
export const basicTranslationWizard = createGenericBookingWizard(
  "basic-translation",
  {
    enableSmartQuote: true,
    summaryDescription:
      "Fixed price per page. Review your quote, then continue to checkout to pay.",
    extraDetailsFields: [
      {
        name: "pageCount",
        type: "number",
        label: "Number of pages",
        placeholder: "e.g. 2",
        required: true,
        min: "1",
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
      notesField,
    ],
    documentsDescription:
      "Upload the document(s) to translate. Metadata is saved now; file storage may be completed later.",
  }
);

import { createGenericBookingWizard, notesField } from "./shared";

/** Fixed-price translation — WizardEngine routes to checkout when service.type === "fixed". */
export const basicTranslationWizard = createGenericBookingWizard(
  "basic-translation",
  {
    summaryDescription:
      "Fixed price per page. After you submit, you will continue to checkout to pay.",
    extraDetailsFields: [
      {
        name: "pageCount",
        type: "text",
        label: "Estimated page count",
        placeholder: "e.g. 2",
      },
      {
        name: "sourceLanguage",
        type: "text",
        label: "Source language",
        placeholder: "e.g. English",
      },
      {
        name: "targetLanguage",
        type: "text",
        label: "Target language",
        placeholder: "e.g. Thai",
      },
      notesField,
    ],
    documentsDescription:
      "Upload the document(s) to translate. Metadata is saved now; file storage may be completed later.",
  }
);

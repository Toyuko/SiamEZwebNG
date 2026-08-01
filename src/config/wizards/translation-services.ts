import { createGenericBookingWizard, notesField } from "./shared";

export const translationServicesWizard = createGenericBookingWizard(
  "translation-services",
  {
    extraDetailsFields: [
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
      {
        name: "documentType",
        type: "text",
        label: "Document type",
        placeholder: "e.g. birth certificate, contract",
      },
      notesField,
    ],
    documentsDescription:
      "Upload the documents to translate if you have them. Metadata is saved now; file storage may be completed later.",
  }
);

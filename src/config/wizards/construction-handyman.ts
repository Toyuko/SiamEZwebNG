import { createGenericBookingWizard, notesField } from "./shared";

export const constructionHandymanWizard = createGenericBookingWizard(
  "construction-handyman",
  {
    enableSmartQuote: true,
    summaryDescription:
      "Complex projects receive an estimated range. A SiamEZ representative will confirm the final quotation.",
    extraDetailsFields: [
      {
        name: "jobType",
        type: "text",
        label: "Job type",
        placeholder: "e.g. plumbing, painting, renovation",
        required: true,
      },
      {
        name: "location",
        type: "text",
        label: "Job location",
        placeholder: "Area or address in Bangkok / Thailand",
        required: true,
      },
      {
        name: "preferredDate",
        type: "date",
        label: "Preferred start date",
      },
      notesField,
    ],
    documentsDescription:
      "Upload photos or sketches of the work area if helpful. Metadata is saved now; file storage may be completed later.",
  }
);

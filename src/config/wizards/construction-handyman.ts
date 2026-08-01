import { createGenericBookingWizard, notesField } from "./shared";

export const constructionHandymanWizard = createGenericBookingWizard(
  "construction-handyman",
  {
    extraDetailsFields: [
      {
        name: "jobType",
        type: "text",
        label: "Job type",
        placeholder: "e.g. plumbing, painting, renovation",
      },
      {
        name: "location",
        type: "text",
        label: "Job location",
        placeholder: "Area or address in Bangkok / Thailand",
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

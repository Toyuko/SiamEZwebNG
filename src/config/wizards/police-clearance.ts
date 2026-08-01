import { createGenericBookingWizard, notesField } from "./shared";

export const policeClearanceWizard = createGenericBookingWizard("police-clearance", {
  extraDetailsFields: [
    {
      name: "purpose",
      type: "select",
      label: "Purpose",
      required: false,
      options: [
        { value: "visa", label: "Visa / immigration" },
        { value: "employment", label: "Employment" },
        { value: "other", label: "Other" },
      ],
    },
    notesField,
  ],
  documentsDescription:
    "Upload passport copy or prior clearance documents if available. Metadata is saved now; file storage may be completed later.",
});

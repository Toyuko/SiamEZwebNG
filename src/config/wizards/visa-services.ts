import { createGenericBookingWizard, notesField } from "./shared";

export const visaServicesWizard = createGenericBookingWizard("visa-services", {
  extraDetailsFields: [
    {
      name: "visaType",
      type: "select",
      label: "Visa type / need",
      options: [
        { value: "tourist", label: "Tourist" },
        { value: "extension", label: "Extension" },
        { value: "non_immigrant", label: "Non-immigrant" },
        { value: "other", label: "Other / not sure" },
      ],
    },
    {
      name: "nationality",
      type: "text",
      label: "Nationality",
      placeholder: "e.g. British, American",
    },
    notesField,
  ],
  documentsDescription:
    "Upload passport bio page or prior visa stamps if available. Metadata is saved now; file storage may be completed later.",
});

import { createGenericBookingWizard, notesField } from "./shared";

export const vehicleRegistrationWizard = createGenericBookingWizard(
  "vehicle-registration",
  {
    extraDetailsFields: [
      {
        name: "registrationType",
        type: "select",
        label: "Registration need",
        options: [
          { value: "transfer", label: "Ownership transfer" },
          { value: "renewal", label: "Tax / insurance renewal" },
          { value: "new_plate", label: "New plate / book update" },
          { value: "lost_book", label: "Lost book replacement" },
          { value: "other", label: "Other" },
        ],
      },
      {
        name: "vehicleType",
        type: "select",
        label: "Vehicle type",
        options: [
          { value: "car", label: "Car" },
          { value: "motorcycle", label: "Motorcycle" },
          { value: "other", label: "Other" },
        ],
      },
      {
        name: "province",
        type: "text",
        label: "Province / plate area",
        placeholder: "e.g. Bangkok (BKK)",
      },
      notesField,
    ],
    documentsDescription:
      "Upload vehicle book, ID, or related paperwork if available. Metadata is saved now; file storage may be completed later.",
  }
);

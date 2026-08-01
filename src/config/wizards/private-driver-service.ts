import { createGenericBookingWizard, notesField } from "./shared";

export const privateDriverServiceWizard = createGenericBookingWizard(
  "private-driver-service",
  {
    extraDetailsFields: [
      {
        name: "packageType",
        type: "select",
        label: "Package",
        options: [
          { value: "hourly", label: "Hourly" },
          { value: "daily", label: "Daily" },
          { value: "monthly", label: "Monthly" },
          { value: "other", label: "Other / custom" },
        ],
      },
      {
        name: "preferredDate",
        type: "date",
        label: "Preferred start date",
      },
      {
        name: "location",
        type: "text",
        label: "Primary location / area",
        placeholder: "e.g. Sukhumvit, Bangkok",
      },
      notesField,
    ],
  }
);

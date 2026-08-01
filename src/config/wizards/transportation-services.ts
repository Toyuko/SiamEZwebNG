import { createGenericBookingWizard, notesField } from "./shared";

export const transportationServicesWizard = createGenericBookingWizard(
  "transportation-services",
  {
    extraDetailsFields: [
      {
        name: "tripType",
        type: "select",
        label: "Trip type",
        options: [
          { value: "airport", label: "Airport transfer" },
          { value: "city", label: "City / local" },
          { value: "intercity", label: "Inter-city" },
          { value: "other", label: "Other" },
        ],
      },
      {
        name: "pickupLocation",
        type: "text",
        label: "Pickup location",
        placeholder: "Hotel, address, or airport",
      },
      {
        name: "dropoffLocation",
        type: "text",
        label: "Drop-off location",
      },
      {
        name: "preferredDate",
        type: "date",
        label: "Preferred date",
      },
      {
        name: "passengerCount",
        type: "text",
        label: "Number of passengers",
        placeholder: "e.g. 2",
      },
      notesField,
    ],
  }
);

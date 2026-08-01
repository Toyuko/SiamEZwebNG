import { createGenericBookingWizard, notesField } from "./shared";

export const eventPlanningVenueServicesWizard = createGenericBookingWizard(
  "event-planning-venue-services",
  {
    summaryDescription:
      "Event planning and venue services in partnership with The Red Door Bkk. Tell us about your event so we can prepare a quote.",
    extraDetailsFields: [
      {
        name: "eventType",
        type: "select",
        label: "Event type",
        labelKey: "fields.eventType",
        options: [
          { value: "corporate", label: "Corporate" },
          { value: "private", label: "Private" },
          { value: "vip_table", label: "VIP table" },
          { value: "other", label: "Other" },
        ],
      },
      {
        name: "eventDate",
        type: "date",
        label: "Event date",
        labelKey: "fields.eventDate",
      },
      {
        name: "guestCount",
        type: "text",
        label: "Guest count",
        labelKey: "fields.guestCount",
        placeholder: "e.g. 50",
      },
      {
        name: "venueNotes",
        type: "textarea",
        label: "Venue / event notes",
        labelKey: "fields.venueNotes",
        placeholder: "Preferred vibe, timing, special requests…",
        maxLength: 2000,
      },
      notesField,
    ],
    documentsDescription:
      "Upload mood boards, floor plans, or briefs if helpful. Metadata is saved now; file storage may be completed later.",
  }
);

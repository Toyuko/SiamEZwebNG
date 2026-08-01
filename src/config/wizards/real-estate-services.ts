import type { WizardCondition, WizardConfig } from "./types";
import { contactFields, notesField } from "./shared";

type RequestType = "buy" | "sell" | "rent" | "invest";

function trimOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

/** Preserve nested `realEstate` formData shape from RealEstateBookingWizard. */
export function buildRealEstateFormData(
  values: Record<string, unknown>
): Record<string, unknown> {
  const requestType = values.requestType as RequestType;
  const propertyTypes = Array.isArray(values.propertyTypes)
    ? (values.propertyTypes as string[])
    : [];
  const isSeekerFlow =
    requestType === "buy" || requestType === "rent" || requestType === "invest";
  const isSellFlow = requestType === "sell";

  return {
    name: values.name,
    email: values.email,
    phone: values.phone,
    lineId: trimOrUndefined(values.lineId),
    location: trimOrUndefined(values.location),
    notes: trimOrUndefined(values.notes),
    realEstate: {
      requestType,
      propertyTypes,
      interestedInListing: Boolean(values.interestedInListing),
      timeline: trimOrUndefined(values.timeline),
      seeker: isSeekerFlow
        ? {
            budgetMin: trimOrUndefined(values.budgetMin),
            budgetMax: trimOrUndefined(values.budgetMax),
            preferredAreas: String(values.preferredAreas ?? "").trim(),
            bedrooms: trimOrUndefined(values.bedrooms),
            details: trimOrUndefined(values.seekerDetails),
          }
        : undefined,
      sell: isSellFlow
        ? {
            propertyDetails: String(values.sellPropertyDetails ?? "").trim(),
            askingPrice: trimOrUndefined(values.askingPrice),
            propertyLocation: trimOrUndefined(values.propertyLocation),
          }
        : undefined,
    },
  };
}

const seekerFlow: WizardCondition = {
  or: [
    { field: "requestType", equals: "buy" },
    { field: "requestType", equals: "rent" },
    { field: "requestType", equals: "invest" },
  ],
};

const sellFlow: WizardCondition = { field: "requestType", equals: "sell" };

export const realEstateServicesWizard: WizardConfig = {
  serviceSlug: "real-estate-services",
  autosaveKey: "real-estate-services",
  showMarketplaceToggle: true,
  buildFormData: buildRealEstateFormData,
  steps: [
    {
      id: "summary",
      type: "summary",
      label: "Service summary",
      description:
        "Buy, sell, rent, or invest with SiamEZ real estate support across Thailand.",
    },
    {
      id: "serviceType",
      type: "fields",
      label: "Request type",
      fields: [
        {
          name: "requestType",
          type: "select",
          label: "I want to",
          required: true,
          options: [
            { value: "buy", label: "Buy" },
            { value: "sell", label: "Sell" },
            { value: "rent", label: "Rent" },
            { value: "invest", label: "Invest" },
          ],
        },
        {
          name: "propertyTypes",
          type: "multiselect",
          label: "Property types",
          required: true,
          options: [
            { value: "condo", label: "Condo" },
            { value: "house", label: "House" },
            { value: "townhouse", label: "Townhouse" },
            { value: "land", label: "Land" },
            { value: "commercial", label: "Commercial" },
            { value: "villa", label: "Villa" },
          ],
        },
      ],
    },
    {
      id: "propertyBrief",
      type: "fields",
      label: "Property brief",
      fields: [
        {
          name: "budgetMin",
          type: "text",
          label: "Budget min (THB)",
          placeholder: "THB",
          showWhen: seekerFlow,
        },
        {
          name: "budgetMax",
          type: "text",
          label: "Budget max (THB)",
          placeholder: "THB",
          showWhen: seekerFlow,
        },
        {
          name: "preferredAreas",
          type: "textarea",
          label: "Preferred areas",
          placeholder: "Neighborhoods, cities…",
          required: true,
          showWhen: seekerFlow,
        },
        {
          name: "bedrooms",
          type: "text",
          label: "Bedrooms",
          placeholder: "e.g. 2",
          showWhen: seekerFlow,
        },
        {
          name: "seekerDetails",
          type: "textarea",
          label: "Additional preferences",
          showWhen: seekerFlow,
        },
        {
          name: "sellPropertyDetails",
          type: "textarea",
          label: "Property details (selling)",
          placeholder: "Type, size, condition…",
          required: true,
          showWhen: sellFlow,
        },
        {
          name: "askingPrice",
          type: "text",
          label: "Asking price (THB)",
          placeholder: "THB",
          showWhen: sellFlow,
        },
        {
          name: "propertyLocation",
          type: "text",
          label: "Property location",
          showWhen: sellFlow,
        },
        {
          name: "timeline",
          type: "text",
          label: "Timeline",
          placeholder: "e.g. within 1 month",
        },
      ],
    },
    {
      id: "details",
      type: "fields",
      label: "Contact",
      fields: [
        ...contactFields,
        {
          name: "lineId",
          type: "text",
          label: "LINE ID",
          placeholder: "@siamez",
        },
        {
          name: "location",
          type: "text",
          label: "Your location",
          placeholder: "City / area",
        },
        notesField,
        {
          name: "interestedInListing",
          type: "checkbox",
          label: "I'm interested in listing on the SiamEZ real estate platform",
        },
      ],
    },
    {
      id: "documents",
      type: "documents",
      label: "Documents",
      description:
        "Upload title deeds, photos, or related files if helpful. Metadata is saved now; file storage may be completed later.",
    },
    {
      id: "review",
      type: "review",
      label: "Review & submit",
    },
  ],
};

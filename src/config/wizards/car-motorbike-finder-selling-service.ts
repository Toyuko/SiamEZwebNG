import type { WizardCondition, WizardConfig } from "./types";
import { contactFields, notesField } from "./shared";

type RequestType = "buy" | "sell" | "both";

function trimOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

/** Preserve nested `vehicleFinder` formData shape from CarMotorbikeFinderBookingWizard. */
export function buildVehicleFinderFormData(
  values: Record<string, unknown>
): Record<string, unknown> {
  const requestType = values.requestType as RequestType;
  const vehicleTypes = Array.isArray(values.vehicleTypes)
    ? (values.vehicleTypes as string[])
    : [];
  const isBuyFlow = requestType === "buy" || requestType === "both";
  const isSellFlow = requestType === "sell" || requestType === "both";

  return {
    name: values.name,
    email: values.email,
    phone: values.phone,
    lineId: trimOrUndefined(values.lineId),
    location: trimOrUndefined(values.location),
    notes: trimOrUndefined(values.notes),
    vehicleFinder: {
      requestType,
      vehicleTypes,
      interestedInSalesListing: Boolean(values.interestedInSalesListing),
      timeline: trimOrUndefined(values.timeline),
      buy: isBuyFlow
        ? {
            budgetMin: trimOrUndefined(values.budgetMin),
            budgetMax: trimOrUndefined(values.budgetMax),
            preferredModels: String(values.preferredModels ?? "").trim(),
          }
        : undefined,
      sell: isSellFlow
        ? {
            vehicleDetails: String(values.sellVehicleDetails ?? "").trim(),
            askingPrice: trimOrUndefined(values.askingPrice),
          }
        : undefined,
    },
  };
}

const buyOrBoth: WizardCondition = {
  or: [
    { field: "requestType", equals: "buy" },
    { field: "requestType", equals: "both" },
  ],
};

const sellOrBoth: WizardCondition = {
  or: [
    { field: "requestType", equals: "sell" },
    { field: "requestType", equals: "both" },
  ],
};

export const carMotorbikeFinderWizard: WizardConfig = {
  serviceSlug: "car-motorbike-finder-selling-service",
  autosaveKey: "car-motorbike-finder-selling-service",
  showMarketplaceToggle: true,
  buildFormData: buildVehicleFinderFormData,
  steps: [
    {
      id: "summary",
      type: "summary",
      label: "Service summary",
      description:
        "Buy or sell cars and motorcycles with SiamEZ sourcing, negotiation, and paperwork support. We'll quote the service fee after reviewing your request.",
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
            { value: "both", label: "Buy and sell" },
          ],
        },
        {
          name: "vehicleTypes",
          type: "multiselect",
          label: "Vehicle types",
          required: true,
          options: [
            { value: "cars", label: "Cars" },
            { value: "motorcycles", label: "Motorcycles" },
            { value: "vans", label: "Vans" },
            { value: "bigBikes", label: "Big bikes" },
          ],
        },
      ],
    },
    {
      id: "vehicleBrief",
      type: "fields",
      label: "Vehicle brief",
      fields: [
        {
          name: "budgetMin",
          type: "text",
          label: "Budget min (THB)",
          placeholder: "THB",
          showWhen: buyOrBoth,
        },
        {
          name: "budgetMax",
          type: "text",
          label: "Budget max (THB)",
          placeholder: "THB",
          showWhen: buyOrBoth,
        },
        {
          name: "preferredModels",
          type: "textarea",
          label: "Preferred models",
          placeholder: "Makes, models, years…",
          required: true,
          showWhen: buyOrBoth,
        },
        {
          name: "sellVehicleDetails",
          type: "textarea",
          label: "Vehicle details (selling)",
          placeholder: "Make, model, year, condition, mileage…",
          required: true,
          showWhen: sellOrBoth,
        },
        {
          name: "askingPrice",
          type: "text",
          label: "Asking price (THB)",
          placeholder: "THB",
          showWhen: sellOrBoth,
        },
        {
          name: "timeline",
          type: "text",
          label: "Timeline",
          placeholder: "e.g. within 2 weeks",
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
          label: "Location",
          placeholder: "City / area",
        },
        notesField,
        {
          name: "interestedInSalesListing",
          type: "checkbox",
          label: "I'm also interested in listing on the SiamEZ sales platform",
        },
      ],
    },
    {
      id: "documents",
      type: "documents",
      label: "Documents",
      description:
        "Upload photos, registration book, or related files if helpful. Metadata is saved now; file storage may be completed later.",
    },
    {
      id: "review",
      type: "review",
      label: "Review & submit",
    },
  ],
};

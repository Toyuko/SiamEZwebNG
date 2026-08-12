import type { ServicePricingConfig } from "@/lib/pricing/types";

/** Driver's license — mirrors src/lib/driver-license-booking.ts amounts (THB). */
export const driverLicensePricing: ServicePricingConfig = {
  serviceSlug: "driver-license",
  quoteMode: "calculated",
  validityDays: 14,
  conciergeHint:
    "Ask about license service type (conversion/renewal/new/IDP), vehicle type, nationality, and optional express/translation add-ons. Never invent prices.",
  questions: [
    {
      name: "category",
      type: "select",
      label: "License service",
      required: true,
      options: [
        { value: "conversion", label: "Foreign license conversion" },
        { value: "renewal", label: "Renewal" },
        { value: "apply_new", label: "Apply for new license" },
        { value: "idp", label: "International Driving Permit (IDP)" },
      ],
    },
    {
      name: "vehicleType",
      type: "select",
      label: "Vehicle type",
      required: true,
      showWhen: { field: "category", notEquals: "idp" },
      options: [
        { value: "bike", label: "Motorcycle / bike" },
        { value: "car", label: "Car" },
        { value: "both", label: "Both car and bike" },
      ],
    },
    {
      name: "nationality",
      type: "text",
      label: "Nationality",
      required: false,
    },
    {
      name: "addonFastTrack",
      type: "checkbox",
      label: "Express / fast-track (+฿1,500)",
    },
    {
      name: "addonTranslationLetter",
      type: "checkbox",
      label: "Translation letter (+฿2,500)",
    },
    {
      name: "addonAddressCertificate",
      type: "checkbox",
      label: "Address certificate (+฿2,500)",
    },
  ],
  rules: [
    // Conversion
    {
      id: "conversion-bike",
      label: "License conversion (motorcycle)",
      category: "service",
      amountThb: 4500,
      when: {
        and: [
          { field: "category", equals: "conversion" },
          { field: "vehicleType", equals: "bike" },
        ],
      },
    },
    {
      id: "conversion-car",
      label: "License conversion (car)",
      category: "service",
      amountThb: 6000,
      when: {
        and: [
          { field: "category", equals: "conversion" },
          { field: "vehicleType", equals: "car" },
        ],
      },
    },
    {
      id: "conversion-both",
      label: "License conversion (car + bike)",
      category: "service",
      amountThb: 10500,
      when: {
        and: [
          { field: "category", equals: "conversion" },
          { field: "vehicleType", equals: "both" },
        ],
      },
    },
    // Renewal
    {
      id: "renewal-bike",
      label: "License renewal (motorcycle)",
      category: "service",
      amountThb: 3500,
      when: {
        and: [
          { field: "category", equals: "renewal" },
          { field: "vehicleType", equals: "bike" },
        ],
      },
    },
    {
      id: "renewal-car",
      label: "License renewal (car)",
      category: "service",
      amountThb: 4500,
      when: {
        and: [
          { field: "category", equals: "renewal" },
          { field: "vehicleType", equals: "car" },
        ],
      },
    },
    {
      id: "renewal-both",
      label: "License renewal (car + bike)",
      category: "service",
      amountThb: 8000,
      when: {
        and: [
          { field: "category", equals: "renewal" },
          { field: "vehicleType", equals: "both" },
        ],
      },
    },
    // New
    {
      id: "new-bike",
      label: "New license (motorcycle)",
      category: "service",
      amountThb: 3500,
      when: {
        and: [
          { field: "category", equals: "apply_new" },
          { field: "vehicleType", equals: "bike" },
        ],
      },
    },
    {
      id: "new-car",
      label: "New license (car)",
      category: "service",
      amountThb: 5000,
      when: {
        and: [
          { field: "category", equals: "apply_new" },
          { field: "vehicleType", equals: "car" },
        ],
      },
    },
    {
      id: "new-both",
      label: "New license (car + bike)",
      category: "service",
      amountThb: 7500,
      when: {
        and: [
          { field: "category", equals: "apply_new" },
          { field: "vehicleType", equals: "both" },
        ],
      },
    },
    // IDP
    {
      id: "idp",
      label: "International Driving Permit",
      category: "service",
      amountThb: 3500,
      when: { field: "category", equals: "idp" },
    },
    // Add-ons
    {
      id: "fast-track",
      label: "Express / fast-track",
      category: "addon",
      amountThb: 1500,
      when: { field: "addonFastTrack", truthy: true },
    },
    {
      id: "translation-letter",
      label: "Translation letter",
      category: "addon",
      amountThb: 2500,
      when: { field: "addonTranslationLetter", truthy: true },
    },
    {
      id: "address-certificate",
      label: "Address certificate",
      category: "addon",
      amountThb: 2500,
      when: { field: "addonAddressCertificate", truthy: true },
    },
  ],
};

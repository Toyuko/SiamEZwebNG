import type { ServicePricingConfig } from "@/lib/pricing/types";

export const marriageRegistrationPricing: ServicePricingConfig = {
  serviceSlug: "marriage-registration",
  quoteMode: "calculated",
  validityDays: 14,
  conciergeHint:
    "Ask about partner nationalities, affidavit status, translation and legalization needs. Government fees are estimated.",
  questions: [
    {
      name: "marriageType",
      type: "select",
      label: "Couple type",
      required: true,
      options: [
        { value: "thai_thai", label: "Thai + Thai" },
        { value: "thai_foreign", label: "Thai + Foreign" },
        { value: "foreign_foreign", label: "Foreign + Foreign" },
        { value: "other", label: "Other" },
      ],
    },
    {
      name: "partnerNationality",
      type: "text",
      label: "Partner nationality",
      required: false,
    },
    {
      name: "needsTranslation",
      type: "checkbox",
      label: "Document translation required",
    },
    {
      name: "needsLegalization",
      type: "checkbox",
      label: "Legalization / MFA assistance",
    },
  ],
  rules: [
    {
      id: "base-service",
      label: "Marriage registration assistance",
      category: "service",
      amountThb: 8500,
    },
    {
      id: "foreign-complexity",
      label: "Foreign national coordination",
      category: "addon",
      amountThb: 2500,
      when: {
        or: [
          { field: "marriageType", equals: "thai_foreign" },
          { field: "marriageType", equals: "foreign_foreign" },
        ],
      },
    },
    {
      id: "translation",
      label: "Document translation",
      category: "addon",
      amountThb: 2500,
      when: { field: "needsTranslation", truthy: true },
    },
    {
      id: "legalization",
      label: "Legalization assistance (estimated gov. fees)",
      category: "government",
      amountThb: 3000,
      feeGuarantee: "estimated",
      when: { field: "needsLegalization", truthy: true },
    },
  ],
};

export const vehicleRegistrationPricing: ServicePricingConfig = {
  serviceSlug: "vehicle-registration",
  quoteMode: "calculated",
  validityDays: 14,
  conciergeHint:
    "Ask vehicle type, registration action (new/transfer/tax), and urgency.",
  questions: [
    {
      name: "vehicleType",
      type: "select",
      label: "Vehicle type",
      required: true,
      options: [
        { value: "car", label: "Car" },
        { value: "motorcycle", label: "Motorcycle" },
        { value: "other", label: "Other" },
      ],
    },
    {
      name: "registrationType",
      type: "select",
      label: "What do you need?",
      required: true,
      options: [
        { value: "transfer", label: "Ownership transfer" },
        { value: "renewal", label: "Tax / insurance renewal" },
        { value: "new_plate", label: "New plate / book update" },
        { value: "lost_book", label: "Lost book replacement" },
        { value: "other", label: "Other" },
      ],
    },
    {
      name: "express",
      type: "checkbox",
      label: "Urgent / express processing",
    },
  ],
  rules: [
    {
      id: "base-car",
      label: "Vehicle registration assistance (car)",
      category: "service",
      amountThb: 4500,
      when: { field: "vehicleType", equals: "car" },
    },
    {
      id: "base-moto",
      label: "Vehicle registration assistance (motorcycle)",
      category: "service",
      amountThb: 3500,
      when: { field: "vehicleType", equals: "motorcycle" },
    },
    {
      id: "base-other",
      label: "Vehicle registration assistance",
      category: "service",
      amountThb: 4000,
      when: { field: "vehicleType", equals: "other" },
    },
    {
      id: "transfer-addon",
      label: "Ownership transfer coordination",
      category: "addon",
      amountThb: 1500,
      when: { field: "registrationType", equals: "transfer" },
    },
    {
      id: "lost-book",
      label: "Lost book replacement assistance",
      category: "addon",
      amountThb: 2000,
      when: { field: "registrationType", equals: "lost_book" },
    },
    {
      id: "express",
      label: "Express processing",
      category: "addon",
      amountThb: 1500,
      when: { field: "express", truthy: true },
    },
    {
      id: "gov-est",
      label: "Government / DLT fees (estimated)",
      category: "government",
      amountThb: 1500,
      feeGuarantee: "estimated",
    },
  ],
};

export const constructionHandymanPricing: ServicePricingConfig = {
  serviceSlug: "construction-handyman",
  quoteMode: "range",
  validityDays: 7,
  conciergeHint:
    "Collect project type, location, size, and scope. Provide a range only — final quote requires site review.",
  questions: [
    {
      name: "jobType",
      type: "text",
      label: "Job type",
      required: true,
    },
    {
      name: "location",
      type: "text",
      label: "Location / province",
      required: true,
    },
    {
      name: "notes",
      type: "textarea",
      label: "Scope of work",
      required: false,
    },
  ],
  rules: [],
  rangeThb: {
    min: 80000,
    max: 120000,
    label: "Estimated project range (subject to site inspection)",
  },
};

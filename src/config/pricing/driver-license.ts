import { normalizeDriverLicenseRequirements } from "@/lib/driver-license-booking";
import type { WizardCondition, WizardFieldConfig } from "@/config/wizards/types";
import type { ServicePricingConfig } from "@/lib/pricing/types";

/** Skip standard conversion / new-license vehicle prices when the 8,000 THB self-cert package applies. */
const notSelfCertConversion: WizardCondition = {
  or: [
    { field: "hasForeignLicense", notEquals: "yes" },
    { field: "residentialCertificate", notEquals: "self" },
  ],
};

export const driverLicenseQuoteQuestions: WizardFieldConfig[] = [
  {
    name: "hasForeignLicense",
    type: "select",
    label: "Do you have a valid license from your country?",
    required: true,
    showWhen: { field: "category", notEquals: "idp" },
    options: [
      { value: "yes", label: "Yes, I have a valid license from my country" },
      { value: "no", label: "No, I do not have a valid foreign license" },
    ],
  },
  {
    name: "residentialCertificate",
    type: "select",
    label:
      "Are you able to obtain a residential certificate from your embassy or immigration, or would you like us to help?",
    required: true,
    showWhen: { field: "category", notEquals: "idp" },
    options: [
      {
        value: "self",
        label: "Yes, I can obtain it from my embassy or immigration",
      },
      {
        value: "need_help",
        label: "Please help me obtain a residential certificate (+฿2,500)",
      },
    ],
  },
  {
    name: "fitToDrive",
    type: "select",
    label: "Is your eyesight OK, and are you fully fit and healthy to drive?",
    required: true,
    description:
      "Thai DLT requires a health and vision check. If you are not fit to drive we can still quote, but you may need a medical certificate before the appointment.",
    options: [
      { value: "yes", label: "Yes, my eyesight is OK and I am fit to drive" },
      { value: "no", label: "No / I am not sure" },
    ],
  },
  {
    name: "vehicleType",
    type: "select",
    label: "Do you want a car license, a motorcycle license, or both?",
    required: true,
    showWhen: { field: "category", notEquals: "idp" },
    options: [
      { value: "bike", label: "Motorcycle license" },
      { value: "car", label: "Car license" },
      { value: "both", label: "Both car and motorcycle" },
    ],
  },
];

/** Driver's license — mirrors src/lib/driver-license-booking.ts amounts (THB). */
export const driverLicensePricing: ServicePricingConfig = {
  serviceSlug: "driver-license",
  quoteMode: "calculated",
  validityDays: 14,
  normalizeRequirements: normalizeDriverLicenseRequirements,
  conciergeHint:
    "Ask each quote question in turn: valid foreign license, residential certificate (self vs we help), fitness/eyesight, and car vs motorcycle vs both. Anyone with their own country license who can obtain a residential certificate is 8,000 THB. Deposit is 25% now and 75% after they get the license. Never invent prices.",
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
    ...driverLicenseQuoteQuestions,
    {
      name: "nationality",
      type: "text",
      label: "Nationality",
      required: false,
    },
    {
      name: "addonTranslationLetter",
      type: "checkbox",
      label: "Translation letter (+฿1,500)",
    },
  ],
  rules: [
    {
      id: "conversion-self-cert",
      label: "License conversion (own country license + residential certificate)",
      category: "service",
      amountThb: 8_000,
      when: {
        and: [
          { field: "hasForeignLicense", equals: "yes" },
          { field: "residentialCertificate", equals: "self" },
          { field: "category", notEquals: "renewal" },
          { field: "category", notEquals: "idp" },
        ],
      },
    },
    // Conversion (standard rates when the 8,000 THB self-cert package does not apply)
    {
      id: "conversion-bike",
      label: "License conversion (motorcycle)",
      category: "service",
      amountThb: 10_000,
      when: {
        and: [
          { field: "category", equals: "conversion" },
          { field: "vehicleType", equals: "bike" },
          notSelfCertConversion,
        ],
      },
    },
    {
      id: "conversion-car",
      label: "License conversion (car)",
      category: "service",
      amountThb: 15_000,
      when: {
        and: [
          { field: "category", equals: "conversion" },
          { field: "vehicleType", equals: "car" },
          notSelfCertConversion,
        ],
      },
    },
    {
      id: "conversion-both",
      label: "License conversion (car + bike)",
      category: "service",
      amountThb: 20_000,
      when: {
        and: [
          { field: "category", equals: "conversion" },
          { field: "vehicleType", equals: "both" },
          notSelfCertConversion,
        ],
      },
    },
    // Renewal — same rate for car or bike; both is discounted vs two singles
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
      amountThb: 3500,
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
      amountThb: 4500,
      when: {
        and: [
          { field: "category", equals: "renewal" },
          { field: "vehicleType", equals: "both" },
        ],
      },
    },
    // New — same rates as conversion
    {
      id: "new-bike",
      label: "New license (motorcycle)",
      category: "service",
      amountThb: 10_000,
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
      amountThb: 15_000,
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
      amountThb: 20_000,
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
      id: "translation-letter",
      label: "Translation letter",
      category: "addon",
      amountThb: 1500,
      when: { field: "addonTranslationLetter", truthy: true },
    },
    {
      id: "address-certificate",
      label: "Residential certificate",
      category: "addon",
      amountThb: 2500,
      when: {
        or: [
          { field: "addonAddressCertificate", truthy: true },
          { field: "residentialCertificate", equals: "need_help" },
        ],
      },
    },
  ],
};

import { DRIVER_LICENSE_PRICES } from "@/config/driver-license-price-guide";
import { normalizeDriverLicenseRequirements } from "@/lib/driver-license-booking";
import type { WizardFieldConfig } from "@/config/wizards/types";
import type { ServicePricingConfig } from "@/lib/pricing/types";

export const driverLicenseQuoteQuestions: WizardFieldConfig[] = [
  {
    name: "hasForeignLicense",
    type: "select",
    label: "Do you have a valid foreign license?",
    required: true,
    presentation: "segmented",
    showWhen: { field: "category", notEquals: "idp" },
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    name: "residentialCertificate",
    type: "select",
    label: "Residential certificate",
    description: "From your embassy or immigration — required for most applications.",
    required: true,
    presentation: "cards",
    showWhen: { field: "category", notEquals: "idp" },
    options: [
      {
        value: "self",
        label: "I'll get it myself",
        description: "From embassy or immigration",
      },
      {
        value: "need_help",
        label: "Help me get one",
        description: "+฿2,500 add-on",
      },
    ],
  },
  {
    name: "fitToDrive",
    type: "select",
    label: "Are you fit to drive (eyesight & health)?",
    required: true,
    presentation: "segmented",
    description:
      "DLT requires a health and vision check. If you're unsure, we can still quote — you may need a medical certificate later.",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No / not sure" },
    ],
  },
  {
    name: "vehicleType",
    type: "select",
    label: "Which license do you need?",
    required: true,
    presentation: "cards",
    showWhen: { field: "category", notEquals: "idp" },
    options: [
      { value: "car", label: "Car", description: "Private car license" },
      { value: "bike", label: "Motorcycle", description: "Motorbike license" },
      { value: "both", label: "Both", description: "Car and motorcycle" },
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
    "Ask each quote question in turn: valid foreign license, residential certificate (self vs we help), fitness/eyesight, and car vs motorcycle vs both. Conversion, renewal, and IDP are 4,500 THB. New license is bike 10,000 / car 15,000 / both 20,000 THB. Deposit is 25% now and 75% after they get the license. Never invent prices.",
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
      id: "conversion-bike",
      label: "License conversion (motorcycle)",
      category: "service",
      amountThb: DRIVER_LICENSE_PRICES.conversion.bike,
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
      amountThb: DRIVER_LICENSE_PRICES.conversion.car,
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
      amountThb: DRIVER_LICENSE_PRICES.conversion.both,
      when: {
        and: [
          { field: "category", equals: "conversion" },
          { field: "vehicleType", equals: "both" },
        ],
      },
    },
    {
      id: "renewal-bike",
      label: "License renewal (motorcycle)",
      category: "service",
      amountThb: DRIVER_LICENSE_PRICES.renewal.bike,
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
      amountThb: DRIVER_LICENSE_PRICES.renewal.car,
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
      amountThb: DRIVER_LICENSE_PRICES.renewal.both,
      when: {
        and: [
          { field: "category", equals: "renewal" },
          { field: "vehicleType", equals: "both" },
        ],
      },
    },
    {
      id: "new-bike",
      label: "New license (motorcycle)",
      category: "service",
      amountThb: DRIVER_LICENSE_PRICES.newLicense.bike,
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
      amountThb: DRIVER_LICENSE_PRICES.newLicense.car,
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
      amountThb: DRIVER_LICENSE_PRICES.newLicense.both,
      when: {
        and: [
          { field: "category", equals: "apply_new" },
          { field: "vehicleType", equals: "both" },
        ],
      },
    },
    {
      id: "idp",
      label: "International Driving Permit",
      category: "service",
      amountThb: DRIVER_LICENSE_PRICES.idp,
      when: { field: "category", equals: "idp" },
    },
    {
      id: "lost-replacement",
      label: "Lost licence / address update",
      category: "service",
      amountThb: DRIVER_LICENSE_PRICES.addons.lostLicenseAddressUpdate,
      when: { field: "category", equals: "lost_replacement" },
    },
    {
      id: "translation-letter",
      label: "Translation letter",
      category: "addon",
      amountThb: DRIVER_LICENSE_PRICES.addons.translationLetter,
      when: { field: "addonTranslationLetter", truthy: true },
    },
    {
      id: "address-certificate",
      label: "Residential certificate",
      category: "addon",
      amountThb: DRIVER_LICENSE_PRICES.addons.residentialCertificate,
      when: {
        or: [
          { field: "addonAddressCertificate", truthy: true },
          { field: "residentialCertificate", equals: "need_help" },
        ],
      },
    },
  ],
};

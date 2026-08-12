import type { ServicePricingConfig } from "@/lib/pricing/types";

export const basicTranslationPricing: ServicePricingConfig = {
  serviceSlug: "basic-translation",
  quoteMode: "fixed",
  useDbFixedPrice: true,
  validityDays: 30,
  conciergeHint: "Basic certified translation is a fixed price from the service catalog.",
  questions: [
    {
      name: "pageCount",
      type: "number",
      label: "Number of pages",
      required: true,
      min: "1",
    },
    {
      name: "sourceLanguage",
      type: "text",
      label: "Source language",
      required: true,
    },
    {
      name: "targetLanguage",
      type: "text",
      label: "Target language",
      required: true,
    },
  ],
  rules: [
    {
      id: "per-page",
      label: "Certified translation (per page)",
      category: "service",
      perUnit: { field: "pageCount", amountThb: 500 },
      feeGuarantee: "exact",
    },
  ],
};

export const translationServicesPricing: ServicePricingConfig = {
  serviceSlug: "translation-services",
  quoteMode: "calculated",
  validityDays: 14,
  conciergeHint:
    "Collect document type, languages, page count, certification, and MFA/legalization needs. Never invent government fees.",
  questions: [
    {
      name: "documentType",
      type: "select",
      label: "Document type",
      required: true,
      options: [
        { value: "general", label: "General document" },
        { value: "legal", label: "Legal / court" },
        { value: "academic", label: "Academic" },
        { value: "id", label: "ID / passport / license" },
      ],
    },
    {
      name: "sourceLanguage",
      type: "text",
      label: "Source language",
      required: true,
    },
    {
      name: "targetLanguage",
      type: "text",
      label: "Target language",
      required: true,
    },
    {
      name: "pageCount",
      type: "number",
      label: "Number of pages",
      required: true,
      min: "1",
    },
    {
      name: "certified",
      type: "checkbox",
      label: "Certified translation required",
    },
    {
      name: "mfaLegalization",
      type: "checkbox",
      label: "MFA / legalization assistance",
    },
    {
      name: "express",
      type: "checkbox",
      label: "Express turnaround",
    },
  ],
  rules: [
    {
      id: "base-pages",
      label: "Translation (per page)",
      category: "service",
      perUnit: { field: "pageCount", amountThb: 500 },
    },
    {
      id: "certified",
      label: "Certification fee",
      category: "addon",
      amountThb: 500,
      when: { field: "certified", truthy: true },
    },
    {
      id: "mfa",
      label: "MFA / legalization assistance (estimated)",
      category: "government",
      amountThb: 2000,
      feeGuarantee: "estimated",
      when: { field: "mfaLegalization", truthy: true },
    },
    {
      id: "express",
      label: "Express turnaround",
      category: "addon",
      amountThb: 1500,
      when: { field: "express", truthy: true },
    },
  ],
};

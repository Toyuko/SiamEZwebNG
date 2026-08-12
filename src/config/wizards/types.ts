/**
 * JSON-driven Universal Wizard Engine config types (SiamEZ 2.0 P2/P3).
 * Configs live under `src/config/wizards/` and are resolved by service slug.
 */

export type WizardFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "tel"
  | "select"
  | "multiselect"
  | "checkbox"
  | "date"
  | "number";

/** Named custom validators beyond Zod primitives (kept small; prefer schema). */
export type WizardFieldCustomValidate = "driverLicenseAppointment";

/** Simple equality / presence checks for conditional visibility. */
export type WizardCondition =
  | { field: string; equals: string | number | boolean }
  | { field: string; notEquals: string | number | boolean }
  | { field: string; truthy: true }
  | { field: string; falsy: true }
  | { and: WizardCondition[] }
  | { or: WizardCondition[] };

export interface WizardFieldOption {
  value: string;
  label: string;
  /** Optional next-intl key under a wizard messages namespace */
  labelKey?: string;
}

export interface WizardFieldConfig {
  name: string;
  type: WizardFieldType;
  label: string;
  labelKey?: string;
  placeholder?: string;
  placeholderKey?: string;
  description?: string;
  required?: boolean;
  options?: WizardFieldOption[];
  /** Show this field only when condition matches */
  showWhen?: WizardCondition;
  /** Extra zod constraints */
  minLength?: number;
  maxLength?: number;
  /** Optional HTML min for date inputs (YYYY-MM-DD). Ignored for custom validators that compute min. */
  min?: string;
  /** Named custom validation (e.g. weekday + lead-time for driver license). */
  customValidate?: WizardFieldCustomValidate;
}

export type WizardStepType =
  | "summary"
  | "fields"
  | "documents"
  | "review"
  | "quote_review";

/** Checklist item for a documents step (missing-doc detection + typed upload). */
export interface WizardRequiredDocument {
  /** Stable id used in checklist / matching (e.g. "passport"). */
  id: string;
  label: string;
  labelKey?: string;
  description?: string;
  /** When false, shown as optional. Default true. */
  required?: boolean;
  /**
   * Stored on Document.documentType and used for missing-doc matching.
   * Defaults to `id` when omitted.
   */
  documentType?: string;
  /** Wizard form fields this document may prefill after extraction. */
  prefillFields?: string[];
}

export interface WizardStepConfig {
  id: string;
  type: WizardStepType;
  label: string;
  labelKey?: string;
  description?: string;
  descriptionKey?: string;
  fields?: WizardFieldConfig[];
  /** Hide entire step when condition fails */
  showWhen?: WizardCondition;
  /** When type is documents, require at least one file before continuing */
  documentsRequired?: boolean;
  /** Per-service missing-document checklist (documents steps). */
  requiredDocuments?: WizardRequiredDocument[];
  /**
   * When true on a fields step, completing it triggers smart-quote generation
   * before advancing (used by AI quote engine services).
   */
  generatesQuote?: boolean;
}

export interface WizardConfig {
  /** Service slug this config applies to */
  serviceSlug: string;
  /** localStorage key suffix; defaults to serviceSlug */
  autosaveKey?: string;
  steps: WizardStepConfig[];
  /** Show marketplace toggle on review step (default true) */
  showMarketplaceToggle?: boolean;
  /** Enable AI / pricing-engine quote flow for this service */
  enableSmartQuote?: boolean;
  /**
   * Optional transform from flat wizard values → Case.formData shape.
   * Documents are merged by the engine after this runs.
   * Use for specialty nested payloads (driverLicense, vehicleFinder, realEstate).
   */
  buildFormData?: (values: Record<string, unknown>) => Record<string, unknown>;
}

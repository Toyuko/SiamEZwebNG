/**
 * JSON-driven Universal Wizard Engine config types (SiamEZ 2.0 P2).
 * Configs live under `src/config/wizards/` and are resolved by service slug.
 */

export type WizardFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "tel"
  | "select"
  | "checkbox"
  | "date"
  | "number";

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
}

export type WizardStepType =
  | "summary"
  | "fields"
  | "documents"
  | "review";

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
}

export interface WizardConfig {
  /** Service slug this config applies to */
  serviceSlug: string;
  /** localStorage key suffix; defaults to serviceSlug */
  autosaveKey?: string;
  steps: WizardStepConfig[];
  /** Show marketplace toggle on review step (default true) */
  showMarketplaceToggle?: boolean;
}

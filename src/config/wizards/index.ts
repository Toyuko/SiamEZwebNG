import type { ServiceSlug } from "@/config/services";
import type { WizardConfig } from "./types";
import { marriageRegistrationWizard } from "./marriage-registration";

export type { WizardConfig, WizardStepConfig, WizardFieldConfig, WizardCondition } from "./types";

/** Slugs that use the Universal Wizard Engine (specialty wizards excluded). */
const WIZARD_REGISTRY: Partial<Record<ServiceSlug, WizardConfig>> = {
  "marriage-registration": marriageRegistrationWizard,
};

export function getWizardConfig(serviceSlug: string): WizardConfig | null {
  return WIZARD_REGISTRY[serviceSlug as ServiceSlug] ?? null;
}

export function hasWizardEngine(serviceSlug: string): boolean {
  return getWizardConfig(serviceSlug) != null;
}

export { marriageRegistrationWizard };

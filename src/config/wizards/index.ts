import type { ServiceSlug } from "@/config/services";
import { serviceSlugs } from "@/config/services";
import type { WizardConfig } from "./types";
import { marriageRegistrationWizard } from "./marriage-registration";
import { policeClearanceWizard } from "./police-clearance";
import { translationServicesWizard } from "./translation-services";
import { visaServicesWizard } from "./visa-services";
import { constructionHandymanWizard } from "./construction-handyman";
import { transportationServicesWizard } from "./transportation-services";
import { privateDriverServiceWizard } from "./private-driver-service";
import { eventPlanningVenueServicesWizard } from "./event-planning-venue-services";
import { basicTranslationWizard } from "./basic-translation";
import { vehicleRegistrationWizard } from "./vehicle-registration";
import { driverLicenseWizard } from "./driver-license";
import { carMotorbikeFinderWizard } from "./car-motorbike-finder-selling-service";
import { realEstateServicesWizard } from "./real-estate-services";

export type {
  WizardConfig,
  WizardStepConfig,
  WizardFieldConfig,
  WizardCondition,
  WizardRequiredDocument,
} from "./types";

/** Full registry: every seeded ServiceSlug books via Universal Wizard Engine. */
const WIZARD_REGISTRY: Record<ServiceSlug, WizardConfig> = {
  "marriage-registration": marriageRegistrationWizard,
  "police-clearance": policeClearanceWizard,
  "translation-services": translationServicesWizard,
  "visa-services": visaServicesWizard,
  "construction-handyman": constructionHandymanWizard,
  "transportation-services": transportationServicesWizard,
  "private-driver-service": privateDriverServiceWizard,
  "event-planning-venue-services": eventPlanningVenueServicesWizard,
  "basic-translation": basicTranslationWizard,
  "vehicle-registration": vehicleRegistrationWizard,
  "driver-license": driverLicenseWizard,
  "car-motorbike-finder-selling-service": carMotorbikeFinderWizard,
  "real-estate-services": realEstateServicesWizard,
};

export function getWizardConfig(serviceSlug: string): WizardConfig | null {
  return WIZARD_REGISTRY[serviceSlug as ServiceSlug] ?? null;
}

export function hasWizardEngine(serviceSlug: string): boolean {
  return getWizardConfig(serviceSlug) != null;
}

/** All seeded service slugs that must have a wizard config (registry coverage). */
export function getRegisteredWizardSlugs(): ServiceSlug[] {
  return [...serviceSlugs];
}

export function assertAllServicesHaveWizardConfigs(): {
  ok: boolean;
  missing: ServiceSlug[];
} {
  const missing = serviceSlugs.filter((slug) => !WIZARD_REGISTRY[slug]);
  return { ok: missing.length === 0, missing: [...missing] };
}

export {
  marriageRegistrationWizard,
  policeClearanceWizard,
  translationServicesWizard,
  visaServicesWizard,
  constructionHandymanWizard,
  transportationServicesWizard,
  privateDriverServiceWizard,
  eventPlanningVenueServicesWizard,
  basicTranslationWizard,
  vehicleRegistrationWizard,
  driverLicenseWizard,
  carMotorbikeFinderWizard,
  realEstateServicesWizard,
};

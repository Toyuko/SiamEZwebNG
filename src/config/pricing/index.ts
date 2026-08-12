import type { ServicePricingConfig } from "@/lib/pricing/types";
import { driverLicensePricing } from "./driver-license";
import {
  basicTranslationPricing,
  translationServicesPricing,
} from "./translation";
import {
  constructionHandymanPricing,
  marriageRegistrationPricing,
  vehicleRegistrationPricing,
} from "./services";

const PRICING_REGISTRY: Record<string, ServicePricingConfig> = {
  [driverLicensePricing.serviceSlug]: driverLicensePricing,
  [basicTranslationPricing.serviceSlug]: basicTranslationPricing,
  [translationServicesPricing.serviceSlug]: translationServicesPricing,
  [marriageRegistrationPricing.serviceSlug]: marriageRegistrationPricing,
  [vehicleRegistrationPricing.serviceSlug]: vehicleRegistrationPricing,
  [constructionHandymanPricing.serviceSlug]: constructionHandymanPricing,
};

export function getServicePricingConfig(
  serviceSlug: string
): ServicePricingConfig | null {
  return PRICING_REGISTRY[serviceSlug] ?? null;
}

export function hasSmartQuote(serviceSlug: string): boolean {
  return getServicePricingConfig(serviceSlug) != null;
}

export function listPricedServiceSlugs(): string[] {
  return Object.keys(PRICING_REGISTRY);
}

export {
  driverLicensePricing,
  basicTranslationPricing,
  translationServicesPricing,
  marriageRegistrationPricing,
  vehicleRegistrationPricing,
  constructionHandymanPricing,
};

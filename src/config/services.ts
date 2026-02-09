/**
 * Service slugs and display config. Content is seeded from siam-ez.com;
 * this file defines slugs and ordering for routing and nav.
 */
export const serviceSlugs = [
  "marriage-registration",
  "translation-services",
  "driver-license",
  "police-clearance",
  "visa-services",
  "construction-handyman",
  "vehicle-registration",
  "transportation-services",
  "private-driver-service",
] as const;

export type ServiceSlug = (typeof serviceSlugs)[number];

export const serviceDisplayNames: Record<ServiceSlug, string> = {
  "marriage-registration": "Marriage Registration",
  "translation-services": "Translation Services",
  "driver-license": "Driver's License",
  "police-clearance": "Police Clearance",
  "visa-services": "Visa Services",
  "construction-handyman": "Construction & Handyman",
  "vehicle-registration": "Vehicle Registration",
  "transportation-services": "Transportation Services",
  "private-driver-service": "Private Driver Service",
};

/** Short descriptions for services (siam-ez.com); used when DB has no data */
export const serviceShortDescriptions: Record<ServiceSlug, string> = {
  "marriage-registration":
    "Complete assistance with Thai marriage registration, documentation, and legal requirements",
  "translation-services":
    "Certified translations for official documents, legal paperwork, and government submissions",
  "driver-license":
    "Expert help obtaining or converting your Thai driver's license with minimal hassle",
  "police-clearance":
    "Assistance with police clearance certificates and background checks for visas",
  "visa-services":
    "Professional guidance on visa applications, extensions, and immigration matters",
  "construction-handyman":
    "Professional home repairs, renovations, and construction services for residential and commercial properties",
  "vehicle-registration":
    "Complete car and motorcycle registration services including transfers, renewals, and documentation",
  "transportation-services":
    "Reliable airport transfers, city tours, and inter-city transportation with comfortable vehicles",
  "private-driver-service":
    "Professional private drivers for daily use, business trips, or special occasions with flexible packages",
};

/** Icons per service for homepage/services grid (lucide names) */
export const serviceIcons: Record<ServiceSlug, string> = {
  "marriage-registration": "Heart",
  "translation-services": "FileText",
  "driver-license": "Car",
  "police-clearance": "Shield",
  "visa-services": "Plane",
  "construction-handyman": "Wrench",
  "vehicle-registration": "ClipboardList",
  "transportation-services": "Taxi",
  "private-driver-service": "User",
};

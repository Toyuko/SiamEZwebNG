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
  "car-motorbike-finder-selling-service",
  "vehicle-registration",
  "transportation-services",
  "private-driver-service",
  "event-planning-venue-services",
] as const;

export type ServiceSlug = (typeof serviceSlugs)[number];

export const serviceDisplayNames: Record<ServiceSlug, string> = {
  "marriage-registration": "Marriage Registration",
  "translation-services": "Translation Services",
  "driver-license": "Driver's License",
  "police-clearance": "Police Clearance",
  "visa-services": "Visa Services",
  "construction-handyman": "Construction & Handyman",
  "car-motorbike-finder-selling-service": "Car & Motorbike Finding and Selling Service",
  "vehicle-registration": "Vehicle Registration",
  "transportation-services": "Transportation Services",
  "private-driver-service": "Private Driver Service",
  "event-planning-venue-services": "Event Planning and Venue Services",
};

/** Short descriptions for services (siam-ez.com); used when DB has no data */
export const serviceShortDescriptions: Record<ServiceSlug, string> = {
  "marriage-registration":
    "Legal marriage registration in Thailand made simple—document prep, Embassy & MFA liaison, and Amphur registration support",
  "translation-services":
    "Certified translations for official documents, legal paperwork, and government submissions",
  "driver-license":
    "Thai driver's license under 2026 DLT rules: conversion, renewal, new car/bike, IDP, FastTrack, and bilingual coordinators in Bangkok",
  "police-clearance":
    "Assistance with police clearance certificates and background checks for visas",
  "visa-services":
    "Professional guidance on visa applications, extensions, and immigration matters",
  "construction-handyman":
    "Professional home repairs, renovations, and construction services for residential and commercial properties",
  "car-motorbike-finder-selling-service":
    "Buy or sell cars and motorcycles in Thailand with full negotiation, paperwork, and registration support from start to finish",
  "vehicle-registration":
    "Professional car and motorcycle registration in Bangkok — 1-day process for BKK plates; transfers, renewals, and DLT paperwork handled for you",
  "transportation-services":
    "Reliable airport transfers, city tours, and inter-city transportation with comfortable vehicles",
  "private-driver-service":
    "Professional private drivers for daily use, business trips, or special occasions with flexible packages",
  "event-planning-venue-services":
    "Event planning and venue services in partnership with The Red Door Bkk",
};

/** Icons per service for homepage/services grid (lucide names) */
export const serviceIcons: Record<ServiceSlug, string> = {
  "marriage-registration": "Heart",
  "translation-services": "FileText",
  "driver-license": "Car",
  "police-clearance": "Shield",
  "visa-services": "Plane",
  "construction-handyman": "Wrench",
  "car-motorbike-finder-selling-service": "Handshake",
  "vehicle-registration": "ClipboardList",
  "transportation-services": "Taxi",
  "private-driver-service": "User",
  "event-planning-venue-services": "PartyPopper",
};

/** Thumbnail images for service cards on public pages */
export const serviceThumbnailImages: Record<ServiceSlug, string> = {
  "marriage-registration": "/images/services/marriage-registration-poster.png",
  "translation-services": "/images/services/translation-services-poster.png",
  "driver-license": "/images/services/driver-license-poster.png",
  "police-clearance": "/images/services/police-clearance-poster.png",
  "visa-services": "/images/services/visa-services-poster.png",
  "construction-handyman": "/images/services/construction-handyman-poster.png",
  "car-motorbike-finder-selling-service":
    "/images/services/car-motorbike-finder-selling-poster.png",
  "vehicle-registration": "/images/services/vehicle-registration-poster.png",
  "transportation-services": "/images/services/transportation-services-poster.png",
  "private-driver-service": "/images/services/private-driver-service-poster.png",
  "event-planning-venue-services": "/images/services/event-planning-venue-services-poster.png",
};

/**
 * CSS `object-position` values for service card images (`object-cover` via Next/Image).
 * Using plain strings + inline `style` avoids Tailwind missing arbitrary `object-*` classes.
 * Vertical % nudges the focal band (faces sit below large headers on portrait posters).
 */
export const serviceThumbnailObjectPosition: Partial<Record<ServiceSlug, string>> = {
  "marriage-registration": "center 18%",
  "translation-services": "center 20%",
  "driver-license": "center 17%",
  "police-clearance": "center 20%",
  "visa-services": "center 30%",
  "construction-handyman": "center 16%",
  "car-motorbike-finder-selling-service": "center 16%",
  "vehicle-registration": "center 22%",
  "transportation-services": "center 20%",
  "private-driver-service": "center 14%",
  "event-planning-venue-services": "18% 78%",
};

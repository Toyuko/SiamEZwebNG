/**
 * Service slugs and display config. Content is seeded from siam-ez.com;
 * this file defines slugs and ordering for routing and nav.
 */
export const serviceSlugs = [
  "driver-license",
  "vehicle-registration",
  "visa-services",
  "translation-services",
  "police-clearance",
  "marriage-registration",
  "basic-translation",
  "construction-handyman",
  "real-estate-services",
  "car-motorbike-finder-selling-service",
  "transportation-services",
  "private-driver-service",
  "event-planning-venue-services",
] as const;

export type ServiceSlug = (typeof serviceSlugs)[number];

export const serviceDisplayNames: Record<ServiceSlug, string> = {
  "driver-license": "Driver's License",
  "vehicle-registration": "Vehicle Registration",
  "visa-services": "Visa Services",
  "translation-services": "Translation Services",
  "police-clearance": "Police Clearance",
  "marriage-registration": "Marriage Registration",
  "basic-translation": "Basic Translation (Fixed Price)",
  "construction-handyman": "Construction & Handyman",
  "real-estate-services": "Real Estate Services",
  "car-motorbike-finder-selling-service": "Car & Motorbike Finding and Selling Service",
  "transportation-services": "Transportation Services",
  "private-driver-service": "Private Driver Service",
  "event-planning-venue-services": "Event Planning and Venue Services",
};

/** Short descriptions for services (siam-ez.com); used when DB has no data */
export const serviceShortDescriptions: Record<ServiceSlug, string> = {
  "driver-license":
    "Thai driver's license under 2026 DLT rules: conversion, renewal, new car/bike, IDP, FastTrack, and bilingual coordinators in Bangkok",
  "vehicle-registration":
    "Professional car and motorcycle registration in Bangkok — 1-day process for BKK plates; transfers, renewals, and DLT paperwork handled for you",
  "visa-services":
    "Professional guidance on visa applications, extensions, and immigration matters",
  "translation-services":
    "Certified translations for official documents, legal paperwork, and government submissions",
  "police-clearance":
    "Assistance with police clearance certificates and background checks for visas",
  "marriage-registration":
    "Legal marriage registration in Thailand made simple—document prep, Embassy & MFA liaison, and Amphur registration support",
  "basic-translation":
    "Simple document translation with fixed pricing per page — pay immediately upon booking",
  "construction-handyman":
    "Professional home repairs, renovations, and construction services for residential and commercial properties",
  "real-estate-services":
    "Buy, sell, rent, or invest in property across Thailand — simple, safe, and stress-free with a trusted local team",
  "car-motorbike-finder-selling-service":
    "Buy or sell cars and motorcycles in Thailand with full negotiation, paperwork, and registration support from start to finish",
  "transportation-services":
    "Reliable airport transfers, city tours, and inter-city transportation with comfortable vehicles",
  "private-driver-service":
    "Professional private drivers for daily use, business trips, or special occasions with flexible packages",
  "event-planning-venue-services":
    "Event planning and venue services in partnership with The Red Door Bkk",
};

/** Icons per service for homepage/services grid (lucide names) */
export const serviceIcons: Record<ServiceSlug, string> = {
  "driver-license": "Car",
  "vehicle-registration": "ClipboardList",
  "visa-services": "Plane",
  "translation-services": "FileText",
  "police-clearance": "Shield",
  "marriage-registration": "Heart",
  "basic-translation": "FileText",
  "construction-handyman": "Wrench",
  "real-estate-services": "Building2",
  "car-motorbike-finder-selling-service": "Handshake",
  "transportation-services": "Taxi",
  "private-driver-service": "User",
  "event-planning-venue-services": "PartyPopper",
};

/** Thumbnail images for service cards on public pages */
export const serviceThumbnailImages: Record<ServiceSlug, string> = {
  "driver-license": "/images/services/driver-license-poster.png",
  "vehicle-registration": "/images/services/vehicle-registration-poster.png",
  "visa-services": "/images/services/visa-services-poster.png",
  "translation-services": "/images/services/translation-services-poster.png",
  "police-clearance": "/images/services/police-clearance-poster.png",
  "marriage-registration": "/images/services/marriage-registration-poster.png",
  "basic-translation": "/images/services/translation-services-poster.png",
  "construction-handyman": "/images/services/construction-handyman-poster.png",
  "real-estate-services": "/images/services/real-estate-services-poster.png",
  "car-motorbike-finder-selling-service":
    "/images/services/car-motorbike-finder-selling-poster.png",
  "transportation-services": "/images/services/transportation-services-poster.png",
  "private-driver-service": "/images/services/private-driver-service-poster.png",
  "event-planning-venue-services": "/images/services/event-planning-venue-services-poster.png",
};

/**
 * CSS `object-position` for `object-cover` thumbnails. Only list slugs that need a
 * non-default crop (e.g. portrait posters); all others use browser default (center).
 */
export const serviceThumbnailObjectPosition: Partial<Record<ServiceSlug, string>> = {
  "construction-handyman": "center 16%",
  "real-estate-services": "center 18%",
  "car-motorbike-finder-selling-service": "center 16%",
  "private-driver-service": "center 22%",
  "event-planning-venue-services": "18% 78%",
};

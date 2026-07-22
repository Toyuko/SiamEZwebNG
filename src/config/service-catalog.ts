/**
 * Central service catalog — single source of truth for directory metadata.
 *
 * HOW TO ADD A NEW SERVICE:
 * 1. Add the slug to `serviceSlugs` in `src/config/services.ts` (routing + nav).
 * 2. Add a full entry below with category, i18n copy, badges, and search keywords.
 * 3. Add search metadata in `src/config/service-search.ts` (category + synonyms).
 * 4. Optionally seed the DB via `prisma/seed.ts` for booking/admin flows.
 * 5. Add poster image to `public/images/services/{slug}-poster.png` (optional).
 * 6. Add detail page content in `src/app/[locale]/(public)/services/[slug]/page.tsx`.
 *
 * DB rows override `name` / `shortDescription` / `priceAmount` when present;
 * catalog fields (category, badges, duration, requirements) always come from here.
 */

import type { ServiceSlug } from "@/config/services";

/** Directory category keys — labels live in i18n: services.directoryCategories.* */
export const serviceDirectoryCategoryKeys = [
  "drivingVehicle",
  "immigrationLegal",
  "translationDocuments",
  "homeProperty",
  "transportPrivateDriver",
  "eventsLifestyle",
  "businessServices",
] as const;

export type ServiceDirectoryCategoryKey = (typeof serviceDirectoryCategoryKeys)[number];

export const serviceBadgeKeys = [
  "popular",
  "sameDay",
  "fixedPrice",
  "homeService",
  "bangkok",
  "nationwide",
] as const;

export type ServiceBadgeKey = (typeof serviceBadgeKeys)[number];

export type LocalizedText = { en: string; th: string };

export type ServiceIconStyle = {
  bg: string;
  text: string;
  shape: "circle" | "square";
};

export type ServiceCatalogEntry = {
  slug: ServiceSlug | string;
  category: ServiceDirectoryCategoryKey;
  /** Shown in Popular Services strip */
  featured: boolean;
  /** Used for "Popular" sort and badge */
  popular: boolean;
  /** Used for "New services" sort */
  isNew?: boolean;
  badges: ServiceBadgeKey[];
  /** Numeric days for "Fastest" sort (lower = faster); null = quote-based */
  processingTimeDays: number | null;
  processingTime: LocalizedText;
  requirementsSummary: LocalizedText;
  keywords: string[];
  icon: string;
  thumbnailImage: string;
  iconStyle: ServiceIconStyle;
  name: LocalizedText;
  shortDescription: LocalizedText;
  active: boolean;
  sortOrder: number;
};

/**
 * Canonical catalog entries for all known services.
 * Order matches public display priority; `sortOrder` controls default listing.
 */
export const serviceCatalog: ServiceCatalogEntry[] = [
  {
    slug: "driver-license",
    category: "drivingVehicle",
    featured: true,
    popular: true,
    badges: ["popular", "bangkok"],
    processingTimeDays: 1,
    processingTime: { en: "1–3 business days", th: "1–3 วันทำการ" },
    requirementsSummary: {
      en: "Passport, visa stamp, medical certificate, residence proof",
      th: "พาสปอร์ต ตราประทับวีซ่า ใบรับรองแพทย์ หลักฐานที่อยู่",
    },
    keywords: ["license", "licence", "dlt", "driving", "idp", "motorcycle", "car", "bangkok", "ใบขับขี่"],
    icon: "Car",
    thumbnailImage: "/images/services/driver-license-poster.png",
    iconStyle: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", shape: "circle" },
    name: { en: "Driver's License", th: "ใบขับขี่" },
    shortDescription: {
      en: "Thai driver's license under 2026 DLT rules: conversion, renewal, new car/bike, IDP, and bilingual coordinators in Bangkok",
      th: "ใบขับขี่ไทยตามกฎ DLT ปี 2026: แปลงใบขับขี่ ต่ออายุ รถ/มอเตอร์ไซค์ใหม่ IDP และผู้ประสานงานสองภาษาในกรุงเทพ",
    },
    active: true,
    sortOrder: 0,
  },
  {
    slug: "vehicle-registration",
    category: "drivingVehicle",
    featured: true,
    popular: true,
    badges: ["popular", "sameDay", "bangkok"],
    processingTimeDays: 1,
    processingTime: { en: "Same day (Bangkok BKK plates)", th: "วันเดียว (ป้าย กทม.)" },
    requirementsSummary: {
      en: "Vehicle book, ID/passport, sale contract or transfer docs",
      th: "เล่มทะเบียนรถ บัตรประชาชน/พาสปอร์ต สัญญาซื้อขายหรือเอกสารโอน",
    },
    keywords: ["registration", "dlt", "plate", "transfer", "car register", "bike register", "จดทะเบียนรถ"],
    icon: "ClipboardList",
    thumbnailImage: "/images/services/vehicle-registration-poster.png",
    iconStyle: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", shape: "square" },
    name: { en: "Vehicle Registration", th: "จดทะเบียนรถ" },
    shortDescription: {
      en: "Car and motorcycle registration in Bangkok — 1-day process for BKK plates; transfers, renewals, and DLT paperwork handled for you",
      th: "จดทะเบียนรถยนต์และมอเตอร์ไซค์ในกรุงเทพ — 1 วันสำหรับป้าย กทม. โอน ต่อภาษี และเอกสาร DLT ครบ",
    },
    active: true,
    sortOrder: 1,
  },
  {
    slug: "visa-services",
    category: "immigrationLegal",
    featured: true,
    popular: true,
    badges: ["popular", "nationwide"],
    processingTimeDays: 5,
    processingTime: { en: "3–10 business days", th: "3–10 วันทำการ" },
    requirementsSummary: {
      en: "Passport, photos, financial proof, supporting letters",
      th: "พาสปอร์ต รูปถ่าย หลักฐานการเงิน หนังสือรับรอง",
    },
    keywords: ["visa", "immigration", "extension", "stay", "permit", "non-immigrant", "tourist", "วีซ่า"],
    icon: "Plane",
    thumbnailImage: "/images/services/visa-services-poster.png",
    iconStyle: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400", shape: "circle" },
    name: { en: "Visa Services", th: "บริการวีซ่า" },
    shortDescription: {
      en: "Professional guidance on visa applications, extensions, and immigration matters",
      th: "คำแนะนำมืออาชีพด้านวีซ่า ต่ออายุ และเรื่องตรวจคนเข้าเมือง",
    },
    active: true,
    sortOrder: 2,
  },
  {
    slug: "translation-services",
    category: "translationDocuments",
    featured: true,
    popular: true,
    badges: ["popular", "nationwide"],
    processingTimeDays: 2,
    processingTime: { en: "1–3 business days", th: "1–3 วันทำการ" },
    requirementsSummary: {
      en: "Original documents (scan or physical)",
      th: "เอกสารต้นฉบับ (สแกนหรือตัวจริง)",
    },
    keywords: ["translate", "translation", "certified", "document", "notarize", "thai english", "แปลเอกสาร"],
    icon: "FileText",
    thumbnailImage: "/images/services/translation-services-poster.png",
    iconStyle: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", shape: "square" },
    name: { en: "Translation Services", th: "บริการแปลเอกสาร" },
    shortDescription: {
      en: "Certified translations for official documents, legal paperwork, and government submissions",
      th: "แปลเอกสารรับรองสำหรับเอกสารราชการ กฎหมาย และการยื่นต่อหน่วยงาน",
    },
    active: true,
    sortOrder: 3,
  },
  {
    slug: "police-clearance",
    category: "immigrationLegal",
    featured: true,
    popular: true,
    badges: ["popular", "nationwide"],
    processingTimeDays: 5,
    processingTime: { en: "3–7 business days", th: "3–7 วันทำการ" },
    requirementsSummary: {
      en: "Passport, visa page, application form, photos",
      th: "พาสปอร์ต หน้าวีซ่า แบบฟอร์ม รูปถ่าย",
    },
    keywords: ["police", "clearance", "background check", "criminal record", "certificate", "หนังสือรับรองความประพฤติ"],
    icon: "Shield",
    thumbnailImage: "/images/services/police-clearance-poster.png",
    iconStyle: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", shape: "circle" },
    name: { en: "Police Clearance", th: "หนังสือรับรองความประพฤติ" },
    shortDescription: {
      en: "Assistance with police clearance certificates and background checks for visas",
      th: "ช่วยเหลือขอหนังสือรับรองความประพฤติและตรวจประวัติสำหรับวีซ่า",
    },
    active: true,
    sortOrder: 4,
  },
  {
    slug: "marriage-registration",
    category: "immigrationLegal",
    featured: false,
    popular: false,
    badges: ["nationwide"],
    processingTimeDays: 14,
    processingTime: { en: "2–4 weeks", th: "2–4 สัปดาห์" },
    requirementsSummary: {
      en: "Passport, birth certificate, embassy docs, Thai partner ID",
      th: "พาสปอร์ต สูติบัตร เอกสารสถานทูต บัตรคู่สมรสไทย",
    },
    keywords: ["marriage", "wedding", "amphur", "embassy", "mfa", "spouse", "register", "จดทะเบียนสมรส"],
    icon: "Heart",
    thumbnailImage: "/images/services/marriage-registration-poster.png",
    iconStyle: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400", shape: "circle" },
    name: { en: "Marriage Registration", th: "จดทะเบียนสมรส" },
    shortDescription: {
      en: "Legal marriage registration in Thailand — document prep, Embassy & MFA liaison, and Amphur support",
      th: "จดทะเบียนสมรสในประเทศไทย — เตรียมเอกสาร ประสานงานสถานทูตและ MFA และอำเภอ",
    },
    active: true,
    sortOrder: 5,
  },
  {
    slug: "basic-translation",
    category: "translationDocuments",
    featured: false,
    popular: false,
    isNew: true,
    badges: ["fixedPrice", "sameDay"],
    processingTimeDays: 1,
    processingTime: { en: "Same day", th: "วันเดียว" },
    requirementsSummary: {
      en: "Clear scan or photo of each page",
      th: "สแกนหรือถ่ายรูปแต่ละหน้าให้ชัด",
    },
    keywords: ["basic translation", "fixed price", "per page", "certified", "แปลราคาคงที่"],
    icon: "FileText",
    thumbnailImage: "/images/services/translation-services-poster.png",
    iconStyle: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", shape: "square" },
    name: { en: "Basic Translation (Fixed Price)", th: "แปลพื้นฐาน (ราคาคงที่)" },
    shortDescription: {
      en: "Simple document translation with fixed pricing per page — pay online when you book",
      th: "แปลเอกสารพื้นฐานราคาคงที่ต่อหน้า — ชำระออนไลน์เมื่อจอง",
    },
    active: true,
    sortOrder: 6,
  },
  {
    slug: "construction-handyman",
    category: "homeProperty",
    featured: false,
    popular: false,
    badges: ["homeService", "bangkok"],
    processingTimeDays: 3,
    processingTime: { en: "Quote within 24 hours", th: "ใบเสนอราคาภายใน 24 ชม." },
    requirementsSummary: {
      en: "Photos of the area, access details, preferred schedule",
      th: "รูปพื้นที่ รายละเอียดการเข้าถึง ตารางเวลาที่ต้องการ",
    },
    keywords: ["construction", "renovation", "repair", "handyman", "home", "condo", "ช่างซ่อม"],
    icon: "Wrench",
    thumbnailImage: "/images/services/construction-handyman-poster.png",
    iconStyle: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400", shape: "circle" },
    name: { en: "Construction & Handyman", th: "ก่อสร้างและช่างซ่อม" },
    shortDescription: {
      en: "Home repairs, renovations, and construction for residential and commercial properties",
      th: "ซ่อมแซม ปรับปรุง และก่อสร้างสำหรับที่อยู่อาศัยและเชิงพาณิชย์",
    },
    active: true,
    sortOrder: 7,
  },
  {
    slug: "real-estate-services",
    category: "homeProperty",
    featured: true,
    popular: true,
    isNew: true,
    badges: ["nationwide", "popular"],
    processingTimeDays: 1,
    processingTime: { en: "Quote within 24 hours", th: "ใบเสนอราคาภายใน 24 ชม." },
    requirementsSummary: {
      en: "Buy/sell/rent/invest goal, budget, preferred area, and timeline",
      th: "เป้าหมายซื้อ/ขาย/เช่า/ลงทุน งบประมาณ พื้นที่ที่ต้องการ และระยะเวลา",
    },
    keywords: [
      "real estate",
      "property",
      "buy house",
      "sell condo",
      "rent",
      "invest",
      "bangkok",
      "thailand",
      "อสังหาริมทรัพย์",
      "ซื้อบ้าน",
      "ขายคอนโด",
      "เช่า",
    ],
    icon: "Building2",
    thumbnailImage: "/images/services/real-estate-services-poster.png",
    iconStyle: {
      bg: "bg-sky-100 dark:bg-sky-900/30",
      text: "text-sky-700 dark:text-sky-400",
      shape: "circle",
    },
    name: { en: "Real Estate Services", th: "บริการอสังหาริมทรัพย์" },
    shortDescription: {
      en: "Buy, sell, rent, or invest — your property, our priority across Thailand",
      th: "ซื้อ ขาย เช่า หรือลงทุน — อสังหาริมทรัพย์ของคุณคือสิ่งสำคัญของเราทั่วไทย",
    },
    active: true,
    sortOrder: 8,
  },
  {
    slug: "car-motorbike-finder-selling-service",
    category: "drivingVehicle",
    featured: false,
    popular: false,
    badges: ["nationwide"],
    processingTimeDays: 7,
    processingTime: { en: "Varies by listing", th: "ขึ้นกับรายการรถ" },
    requirementsSummary: {
      en: "Budget, preferred make/model, registration status",
      th: "งบประมาณ ยี่ห้อ/รุ่นที่ต้องการ สถานะทะเบียน",
    },
    keywords: ["buy car", "sell car", "motorbike", "motorcycle", "dealer", "vehicle finder", "ซื้อขายรถ"],
    icon: "Handshake",
    thumbnailImage: "/images/services/car-motorbike-finder-selling-poster.png",
    iconStyle: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", shape: "circle" },
    name: { en: "Car & Motorbike Finding and Selling", th: "หารถซื้อ-ขายรถยนต์และมอเตอร์ไซค์" },
    shortDescription: {
      en: "Buy or sell cars and motorcycles with negotiation, paperwork, and registration support",
      th: "ซื้อหรือขายรถยนต์และมอเตอร์ไซค์ พร้อมต่อรอง เอกสาร และจดทะเบียน",
    },
    active: true,
    sortOrder: 9,
  },
  {
    slug: "transportation-services",
    category: "transportPrivateDriver",
    featured: false,
    popular: false,
    badges: ["bangkok", "sameDay"],
    processingTimeDays: 0,
    processingTime: { en: "Same day booking", th: "จองวันเดียว" },
    requirementsSummary: {
      en: "Pickup/drop-off locations, date, passenger count",
      th: "จุดรับ-ส่ง วันที่ จำนวนผู้โดยสาร",
    },
    keywords: ["airport", "transfer", "taxi", "shuttle", "transport", "tour", "รับส่งสนามบิน"],
    icon: "Bus",
    thumbnailImage: "/images/services/transportation-services-poster.png",
    iconStyle: { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-600 dark:text-cyan-400", shape: "circle" },
    name: { en: "Transportation Services", th: "บริการรับส่งและขนส่ง" },
    shortDescription: {
      en: "Airport transfers, city tours, and inter-city transportation with comfortable vehicles",
      th: "รับส่งสนามบิน ทัวร์ในเมือง และเดินทางระหว่างจังหวัด",
    },
    active: true,
    sortOrder: 10,
  },
  {
    slug: "private-driver-service",
    category: "transportPrivateDriver",
    featured: false,
    popular: false,
    badges: ["bangkok", "homeService"],
    processingTimeDays: 0,
    processingTime: { en: "Flexible packages", th: "แพ็กเกจยืดหยุ่น" },
    requirementsSummary: {
      en: "Schedule, pickup address, vehicle preference",
      th: "ตารางเวลา ที่อยู่รับ ประเภทรถที่ต้องการ",
    },
    keywords: ["chauffeur", "driver", "private driver", "hire driver", "daily driver", "คนขับส่วนตัว"],
    icon: "User",
    thumbnailImage: "/images/services/private-driver-service-poster.png",
    iconStyle: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400", shape: "circle" },
    name: { en: "Private Driver Service", th: "บริการคนขับส่วนตัว" },
    shortDescription: {
      en: "Professional private drivers for daily use, business trips, or special occasions",
      th: "คนขับมืออาชีพสำหรับใช้ประจำ ธุรกิจ หรือโอกาสพิเศษ",
    },
    active: true,
    sortOrder: 11,
  },
  {
    slug: "event-planning-venue-services",
    category: "eventsLifestyle",
    featured: false,
    popular: false,
    badges: ["bangkok"],
    processingTimeDays: 14,
    processingTime: { en: "2–6 weeks planning", th: "วางแผน 2–6 สัปดาห์" },
    requirementsSummary: {
      en: "Event date, guest count, style preferences",
      th: "วันจัดงาน จำนวนแขก สไตล์ที่ต้องการ",
    },
    keywords: ["event", "wedding venue", "party", "planning", "red door", "venue", "จัดงาน"],
    icon: "PartyPopper",
    thumbnailImage: "/images/services/event-planning-venue-services-poster.png",
    iconStyle: { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-600 dark:text-rose-400", shape: "circle" },
    name: { en: "Event Planning and Venue Services", th: "จัดงานและสถานที่จัดงาน" },
    shortDescription: {
      en: "Event planning and venue services in partnership with The Red Door Bkk",
      th: "บริการจัดงานและสถานที่ ร่วมกับ The Red Door Bkk",
    },
    active: true,
    sortOrder: 12,
  },
];

export const popularServiceSlugs: string[] = serviceCatalog
  .filter((s) => s.featured)
  .map((s) => s.slug);

const catalogBySlug = new Map(serviceCatalog.map((e) => [e.slug, e]));

export function getServiceCatalogEntry(slug: string): ServiceCatalogEntry | undefined {
  return catalogBySlug.get(slug);
}

export function getActiveCatalogEntries(): ServiceCatalogEntry[] {
  return serviceCatalog.filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder);
}

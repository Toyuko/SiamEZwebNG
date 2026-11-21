import { resolvePublicSiteUrl } from "@/config/site-url";

const PHONE_DISPLAY = "+66 64 343 8768";
const PHONE_DIGITS = PHONE_DISPLAY.replace(/\D/g, "");

export const site = {
  name: "SiamEZ",
  tagline: "Making life in Thailand EZ",
  description: "Professional help for your life in Thailand. From visas to relocations, our team handles the complexities so you can focus on enjoying the Land of Smiles.",
  url: resolvePublicSiteUrl(),
  email: "inquiries@siam-ez.com",
  phone: PHONE_DISPLAY,
  phoneDigits: PHONE_DIGITS,
  /** Canonical WhatsApp deep link (wa.me). Prefer this over ad-hoc URLs. */
  whatsappUrl: `https://wa.me/${PHONE_DIGITS}`,
  line: "@siamez",
  lineUrl: "https://lin.ee/AHqaAXi",
  address: {
    line1: "No.2556, 66 Tower, Level 4, Office Room 444-01",
    line2: "Bang Na, Bangkok 10260, Thailand",
    full: "No.2556, 66 Tower, Level 4, Office Room 444-01, Bang Na, Bangkok 10260, Thailand",
    coords: { lat: 13.6823856, lng: 100.6096155 },
    placeId: "ChIJoQi-v8JJA68RqRtvTftrbw8",
  },
  social: {
    facebook: "https://www.facebook.com/siamezth",
    instagram: "https://www.instagram.com/siam_ez/",
    linkedin: "https://www.linkedin.com/company/siam-ez/",
    youtube: "https://www.youtube.com/@siamezofficial/",
    tiktok: "https://www.tiktok.com/@siam_ez",
  },
  legal: {
    companyName: "SiamEZ Professional Services Co., Ltd.",
    termsUrl: "/terms",
    privacyUrl: "/privacy",
    deleteAccountUrl: "/delete-account",
    refundUrl: "/refund",
    partnerUrl: "/partner",
  },
  stats: {
    happyClients: "1000+",
    yearsExperience: "10+",
    successRate: "100%",
  },
} as const;

export type PublicNavLink = {
  labelKey: string;
  href: string;
  match?: "exact" | "prefix";
};

export type PublicNavEntry =
  | ({ type: "link" } & PublicNavLink)
  | {
      type: "group";
      id: string;
      labelKey: string;
      items: PublicNavLink[];
    };

/**
 * Premium public navigation — conversion-focused top bar.
 * Marketplace / secondary routes live under Services & About dropdowns
 * so existing routes remain reachable without cluttering the primary CTA path.
 */
export const publicNav: PublicNavEntry[] = [
  { type: "link", labelKey: "home", href: "/", match: "exact" },
  {
    type: "group",
    id: "services",
    labelKey: "services",
    items: [
      { labelKey: "allServices", href: "/services", match: "prefix" },
      { labelKey: "sales", href: "/sales", match: "prefix" },
      { labelKey: "realEstate", href: "/real-estate", match: "prefix" },
      { labelKey: "freelancers", href: "/freelancers", match: "prefix" },
    ],
  },
  { type: "link", labelKey: "booking", href: "/services", match: "exact" },
  {
    type: "group",
    id: "about",
    labelKey: "aboutUs",
    items: [
      { labelKey: "about", href: "/about", match: "exact" },
      { labelKey: "testimonials", href: "/testimonials", match: "exact" },
      { labelKey: "gallery", href: "/gallery", match: "exact" },
    ],
  },
  { type: "link", labelKey: "contact", href: "/contact", match: "exact" },
];

export const footerQuickLinks = [
  { label: "Services", href: "/services" },
  { label: "Vehicles", href: "/sales" },
  { label: "Sell or find a vehicle", href: "/vehicle" },
  { label: "Real Estate", href: "/real-estate" },
  { label: "About Us", href: "/about" },
  { label: "Testimonials", href: "/testimonials" },
  { label: "Contact", href: "/contact" },
] as const;

export const footerLegal = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Delete Account", href: "/delete-account" },
  { label: "Refund Policy", href: "/refund" },
  { label: "Partner Program", href: "/partner" },
] as const;

export const site = {
  name: "SiamEZ",
  tagline: "Making life in Thailand EZ",
  description: "Professional help for your life in Thailand. From visas to relocations, our team handles the complexities so you can focus on enjoying the Land of Smiles.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://siam-e-zweb-ng.vercel.app",
  email: "inquiries@siam-ez.com",
  phone: "+66 64 343 8768",
  line: "@siamez",
  lineUrl: "https://lin.ee/AHqaAXi",
  address: {
    line1: "No.2556, 66 Tower, Level 4, Office Room 444-01",
    line2: "Bang Na, Bangkok 10260, Thailand",
    full: "No.2556, 66 Tower, Level 4, Office Room 444-01, Bang Na, Bangkok 10260, Thailand",
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
 * Soft-launch public navigation.
 * Keep freelancers / gallery / testimonials reachable via footer or direct URL,
 * but out of the primary nav so conversion stays focused.
 */
export const publicNav: PublicNavEntry[] = [
  { type: "link", labelKey: "home", href: "/", match: "exact" },
  { type: "link", labelKey: "services", href: "/services", match: "prefix" },
  { type: "link", labelKey: "sales", href: "/sales", match: "prefix" },
  { type: "link", labelKey: "realEstate", href: "/real-estate", match: "prefix" },
  { type: "link", labelKey: "contact", href: "/contact", match: "exact" },
];

export const footerQuickLinks = [
  { label: "Services", href: "/services" },
  { label: "Vehicles", href: "/sales" },
  { label: "Sell or find a vehicle", href: "/vehicle" },
  { label: "Real Estate", href: "/real-estate" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const footerLegal = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Refund Policy", href: "/refund" },
  { label: "Partner Program", href: "/partner" },
] as const;
